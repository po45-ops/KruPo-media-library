begin;

alter table public.refunds
  add column if not exists provider_failure_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists refunds_processing_reconciliation
  on public.refunds(updated_at,created_at)
  where status='processing';

comment on column public.refunds.provider_failure_reason is 'เหตุผลที่ผู้ให้บริการคืนเงินไม่สำเร็จ ห้ามใช้แทนเหตุผลจากผู้ดูแล';
comment on column public.refunds.updated_at is 'เวลาที่สถานะคืนเงินถูกอัปเดตล่าสุด ใช้สำหรับ reconciliation';

create or replace function public.apply_refund_provider_status(
  p_refund_id uuid,
  p_provider_status text,
  p_failure_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_refund public.refunds%rowtype;
  v_order public.orders%rowtype;
  v_entry record;
  v_creator_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  if p_provider_status not in ('pending','succeeded','failed') then raise exception 'invalid refund status'; end if;

  select * into v_refund from public.refunds where id=p_refund_id for update;
  if not found then raise exception 'refund unavailable'; end if;

  if p_provider_status='pending' then
    if v_refund.status in ('requested','approved','processing') then
      update public.refunds
        set status='processing',provider_failure_reason=null,updated_at=now()
        where id=p_refund_id;
    end if;
    return jsonb_build_object('status',case when v_refund.status in ('requested','approved','processing') then 'processing' else v_refund.status end,'pending',true);
  end if;

  if p_provider_status='failed' then
    if v_refund.status='refunded' then
      return jsonb_build_object('status','refunded','ignored_terminal_failure',true);
    end if;
    update public.refunds
      set status='failed',provider_failure_reason=left(p_failure_reason,500),completed_at=now(),updated_at=now()
      where id=p_refund_id;
    insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason)
      values(v_refund.created_by,'refund_failed','refund',p_refund_id::text,
        jsonb_build_object('status',v_refund.status),jsonb_build_object('status','failed'),
        coalesce(left(p_failure_reason,500),'provider reported refund failure'));
    return jsonb_build_object('status','failed');
  end if;

  if v_refund.status='refunded' then
    return jsonb_build_object('status','refunded','duplicate',true);
  end if;

  select * into v_order from public.orders where id=v_refund.order_id for update;
  if not found or v_order.status<>'paid' then raise exception 'order is not refundable'; end if;

  for v_entry in
    select l.*
      from public.financial_ledger_entries l
      join public.order_items oi on oi.id=l.reference_id
      where l.reference_type='order_item'
        and oi.order_id=v_refund.order_id
        and l.kind in ('sale_creator','sale_platform')
        and not exists(select 1 from public.financial_ledger_entries r where r.reverses_entry_id=l.id)
  loop
    insert into public.financial_ledger_entries(
      creator_id,kind,status,amount_satang,reference_type,reference_id,reverses_entry_id,available_at,created_by
    ) values(
      v_entry.creator_id,
      case when v_entry.kind='sale_creator' then 'refund_creator' else 'refund_platform' end,
      'available',-abs(v_entry.amount_satang),'refund',p_refund_id,v_entry.id,now(),v_refund.created_by
    );
  end loop;

  update public.orders
    set status='refunded',refunded_at=now(),updated_at=now()
    where id=v_refund.order_id;
  update public.payments
    set status='refunded',updated_at=now()
    where id=v_refund.payment_id and status='paid';
  update public.entitlements
    set revoked_at=now(),revoke_reason='refund: '||v_refund.reason
    where order_id=v_refund.order_id and revoked_at is null;
  update public.creator_earnings
    set status='reversed'
    where order_item_id in(select id from public.order_items where order_id=v_refund.order_id);
  update public.media_items m
    set sales_count=greatest(0,sales_count-1)
    where id in(select media_id from public.order_items where order_id=v_refund.order_id);
  update public.refunds
    set status='refunded',provider_failure_reason=null,completed_at=now(),updated_at=now()
    where id=p_refund_id;

  for v_creator_id in
    select distinct creator_id_snapshot
      from public.order_items
      where order_id=v_refund.order_id and creator_id_snapshot is not null
  loop
    perform public.refresh_creator_balance_cache(v_creator_id);
  end loop;

  insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason)
    values(v_refund.created_by,'order_refunded','order',v_refund.order_id::text,
      jsonb_build_object('status','paid'),
      jsonb_build_object('status','refunded','refund_id',p_refund_id,'provider_refund_id',v_refund.provider_refund_id),
      v_refund.reason);
  return jsonb_build_object('status','refunded','order_id',v_refund.order_id);
end;
$$;

create or replace function public.record_provider_refund_request(
  p_order_id uuid,
  p_reason text,
  p_actor_id uuid,
  p_provider_refund_id text,
  p_provider_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_refund_id uuid;
  v_existing_order_id uuid;
  v_result jsonb;
begin
  if auth.role()<>'service_role'
    or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','finance') and revoked_at is null)
  then raise exception 'not authorized'; end if;
  if p_provider_status not in ('pending','succeeded','failed') then raise exception 'invalid refund status'; end if;
  if p_provider_refund_id is null or length(p_provider_refund_id)<3 then raise exception 'provider refund evidence required'; end if;

  select id,order_id into v_refund_id,v_existing_order_id
    from public.refunds where provider_refund_id=p_provider_refund_id;
  if found then
    if v_existing_order_id<>p_order_id then raise exception 'refund order mismatch'; end if;
    return public.apply_refund_provider_status(v_refund_id,p_provider_status,null);
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.status<>'paid' then raise exception 'order is not refundable'; end if;
  select * into v_payment
    from public.payments
    where order_id=p_order_id and status='paid'
    order by created_at desc limit 1 for update;
  if not found then raise exception 'paid payment unavailable'; end if;

  v_refund_id:=gen_random_uuid();
  insert into public.refunds(
    id,order_id,payment_id,amount_satang,reason,status,provider_refund_id,created_by,updated_at
  ) values(
    v_refund_id,p_order_id,v_payment.id,v_order.total_satang,p_reason,'processing',p_provider_refund_id,p_actor_id,now()
  );
  v_result:=public.apply_refund_provider_status(v_refund_id,p_provider_status,null);
  return v_result||jsonb_build_object('refund_id',v_refund_id);
end;
$$;

create or replace function public.process_verified_refund_event(
  p_provider text,
  p_event_id text,
  p_provider_refund_id text,
  p_provider_payment_id text,
  p_status text,
  p_amount_satang integer,
  p_event_type text,
  p_payload_hash text,
  p_failure_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event_pk uuid;
  v_refund public.refunds%rowtype;
  v_payment public.payments%rowtype;
  v_result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  if p_event_type not in ('refund.updated','refund.failed') then raise exception 'invalid refund event'; end if;
  if p_status not in ('pending','succeeded','failed') then raise exception 'invalid refund status'; end if;

  insert into public.payment_webhook_events(provider,event_id,event_type,payload_hash,processing_status)
    values(p_provider,p_event_id,p_event_type,p_payload_hash,'received')
    on conflict(provider,event_id) do nothing returning id into v_event_pk;
  if v_event_pk is null then return jsonb_build_object('duplicate',true); end if;

  select * into v_refund from public.refunds where provider_refund_id=p_provider_refund_id for update;
  if not found then
    update public.payment_webhook_events
      set processing_status='rejected',processed_at=now(),error_code='unknown_refund'
      where id=v_event_pk;
    return jsonb_build_object('accepted',false,'reason','unknown_refund');
  end if;
  update public.payment_webhook_events set order_id=v_refund.order_id where id=v_event_pk;

  select * into v_payment from public.payments where id=v_refund.payment_id;
  if not found or v_payment.provider<>p_provider
    or (p_provider_payment_id is not null and v_payment.provider_payment_id<>p_provider_payment_id)
  then
    update public.payment_webhook_events
      set processing_status='rejected',processed_at=now(),error_code='refund_payment_mismatch'
      where id=v_event_pk;
    return jsonb_build_object('accepted',false,'reason','refund_payment_mismatch');
  end if;
  if v_refund.amount_satang<>p_amount_satang then
    update public.payment_webhook_events
      set processing_status='rejected',processed_at=now(),error_code='refund_amount_mismatch'
      where id=v_event_pk;
    return jsonb_build_object('accepted',false,'reason','refund_amount_mismatch');
  end if;

  v_result:=public.apply_refund_provider_status(v_refund.id,p_status,p_failure_reason);
  update public.payment_webhook_events
    set processing_status='processed',processed_at=now()
    where id=v_event_pk;
  return v_result||jsonb_build_object('accepted',true);
end;
$$;

create or replace function public.reconcile_provider_refund(
  p_provider_refund_id text,
  p_provider_status text,
  p_amount_satang integer,
  p_failure_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_refund public.refunds%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  select * into v_refund from public.refunds where provider_refund_id=p_provider_refund_id for update;
  if not found then raise exception 'refund unavailable'; end if;
  if v_refund.amount_satang<>p_amount_satang then raise exception 'refund amount mismatch'; end if;
  return public.apply_refund_provider_status(v_refund.id,p_provider_status,p_failure_reason)
    ||jsonb_build_object('reconciled',true);
end;
$$;

revoke all on function public.apply_refund_provider_status(uuid,text,text) from public,anon,authenticated;
revoke all on function public.record_provider_refund_request(uuid,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.process_verified_refund_event(text,text,text,text,text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.reconcile_provider_refund(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.apply_refund_provider_status(uuid,text,text) to service_role;
grant execute on function public.record_provider_refund_request(uuid,text,uuid,text,text) to service_role;
grant execute on function public.process_verified_refund_event(text,text,text,text,text,integer,text,text,text) to service_role;
grant execute on function public.reconcile_provider_refund(text,text,integer,text) to service_role;

comment on function public.process_verified_refund_event(text,text,text,text,text,integer,text,text,text) is
  'ประมวลผล refund.updated/refund.failed ที่ตรวจลายเซ็นแล้วแบบ idempotent';
comment on function public.reconcile_provider_refund(text,text,integer,text) is
  'ปรับสถานะคืนเงินจากผลตรวจซ้ำกับ PaymentProvider โดยไม่สร้าง ledger ซ้ำ';

commit;
