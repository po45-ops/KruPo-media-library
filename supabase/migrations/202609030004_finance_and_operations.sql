begin;

create or replace function public.create_full_refund(p_order_id uuid,p_reason text,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_refund_id uuid:=gen_random_uuid();v_entry record;
begin
 if auth.role()<>'service_role' then raise exception 'server only'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'paid' then raise exception 'order is not refundable'; end if;
 insert into public.refunds(id,order_id,amount_satang,reason,status,created_by,completed_at) values(v_refund_id,p_order_id,v_order.total_satang,p_reason,'refunded',p_actor_id,now());
 for v_entry in select l.* from public.financial_ledger_entries l join public.order_items oi on oi.id=l.reference_id where l.reference_type='order_item' and oi.order_id=p_order_id and l.kind in ('sale_creator','sale_platform') loop
  insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,reverses_entry_id,available_at,created_by)
  values(v_entry.creator_id,case when v_entry.kind='sale_creator' then 'refund_creator' else 'refund_platform' end,'available',-abs(v_entry.amount_satang),'refund',v_refund_id,v_entry.id,now(),p_actor_id);
 end loop;
 update public.orders set status='refunded',refunded_at=now() where id=p_order_id;
 update public.payments set status='refunded' where order_id=p_order_id and status='paid';
 update public.entitlements set revoked_at=now(),revoke_reason='refund: '||p_reason where order_id=p_order_id and revoked_at is null;
 update public.creator_earnings set status='reversed' where order_item_id in(select id from public.order_items where order_id=p_order_id);
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'order_refunded','order',p_order_id::text,jsonb_build_object('status','paid'),jsonb_build_object('status','refunded','refund_id',v_refund_id),p_reason);
 return v_refund_id;
end $$;
revoke all on function public.create_full_refund(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.create_full_refund(uuid,text,uuid) to service_role;

create or replace function public.record_manual_payout(p_creator_id uuid,p_ledger_entry_ids uuid[],p_external_reference text,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_payout_id uuid:=gen_random_uuid();v_total integer;v_min integer:=50000;v_count integer;
begin
 if auth.role()<>'service_role' then raise exception 'server only'; end if;
 if cardinality(p_ledger_entry_ids)=0 or cardinality(p_ledger_entry_ids)<>(select count(distinct x) from unnest(p_ledger_entry_ids) x) then raise exception 'invalid payout items'; end if;
 perform 1 from public.financial_ledger_entries where id=any(p_ledger_entry_ids) for share;
 select count(*),coalesce(sum(amount_satang),0)::integer into v_count,v_total from public.financial_ledger_entries where id=any(p_ledger_entry_ids) and creator_id=p_creator_id and kind in ('sale_creator','refund_creator','adjustment') and available_at<=now() and amount_satang>0;
 if v_count<>cardinality(p_ledger_entry_ids) then raise exception 'ledger entries unavailable'; end if;
 select coalesce((value #>> '{}')::integer,50000) into v_min from public.system_settings where key='minimum_payout_satang';
 if v_total<v_min then raise exception 'minimum payout not met'; end if;
 insert into public.payouts(id,creator_id,amount_satang,status,method,external_reference,approved_by,paid_by,paid_at) values(v_payout_id,p_creator_id,v_total,'paid','manual',p_external_reference,p_actor_id,p_actor_id,now());
 insert into public.payout_items(payout_id,ledger_entry_id,amount_satang) select v_payout_id,id,amount_satang from public.financial_ledger_entries where id=any(p_ledger_entry_ids);
 insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,available_at,created_by,metadata) values(p_creator_id,'payout','paid',-v_total,'payout',v_payout_id,now(),p_actor_id,jsonb_build_object('external_reference',p_external_reference));
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,after_state,reason) values(p_actor_id,'manual_payout_recorded','payout',v_payout_id::text,jsonb_build_object('creator_id',p_creator_id,'amount_satang',v_total),'manual payout with external evidence');
 return v_payout_id;
end $$;
revoke all on function public.record_manual_payout(uuid,uuid[],text,uuid) from public,anon,authenticated;
grant execute on function public.record_manual_payout(uuid,uuid[],text,uuid) to service_role;

create or replace function public.refresh_creator_balance_cache(p_creator_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.role()<>'service_role' then raise exception 'server only'; end if;
 insert into public.creator_balances(creator_id,pending_satang,on_hold_satang,available_satang,paid_satang,calculated_at,source_last_entry_id)
 select p_creator_id,
  coalesce(sum(amount_satang) filter(where status='pending'),0)::integer,
  coalesce(sum(amount_satang) filter(where status='on_hold' and available_at>now()),0)::integer,
  coalesce(sum(amount_satang) filter(where kind<>'payout' and available_at<=now()),0)::integer,
  coalesce(-sum(amount_satang) filter(where kind='payout'),0)::integer,now(),(array_agg(id order by created_at desc))[1]
 from public.financial_ledger_entries where creator_id=p_creator_id
 on conflict(creator_id) do update set pending_satang=excluded.pending_satang,on_hold_satang=excluded.on_hold_satang,available_satang=excluded.available_satang,paid_satang=excluded.paid_satang,calculated_at=excluded.calculated_at,source_last_entry_id=excluded.source_last_entry_id;
end $$;
revoke all on function public.refresh_creator_balance_cache(uuid) from public,anon,authenticated;
grant execute on function public.refresh_creator_balance_cache(uuid) to service_role;

insert into public.system_settings(key,value,is_public,description_th) values
('strike_policy','{"enhanced_review":2,"temporary_suspend":3,"permanent_suspend":5}',false,'จำนวน strike สำหรับ action ต่อผู้สร้าง'),
('link_failure_threshold','3',false,'จำนวนครั้งล้มเหลวก่อน degraded'),
('link_suspend_threshold','5',false,'จำนวนครั้งล้มเหลวก่อนหยุดขาย')
on conflict(key) do nothing;

commit;
