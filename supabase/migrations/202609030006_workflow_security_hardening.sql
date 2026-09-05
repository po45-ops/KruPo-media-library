begin;

-- Restrict self-service profile updates to non-privileged columns. RLS limits
-- rows; column grants prevent users from re-activating a suspended account.
revoke update on public.profiles from authenticated;
grant update(display_name,avatar_url,phone,locale,timezone) on public.profiles to authenticated;

-- Never expose creator legal/contact data through the public directory.
drop policy if exists creators_public_read on public.creator_profiles;
revoke select on public.creator_profiles from anon,authenticated;
grant select on public.creator_profiles to authenticated;
create or replace view public.creator_directory with (security_barrier=true) as
select user_id,display_name,creator_type,bio,trust_level,status,approved_at,created_at
from public.creator_profiles where status in ('approved','verified','trusted');
revoke all on public.creator_directory from public,anon,authenticated;
grant select on public.creator_directory to anon,authenticated;
comment on view public.creator_directory is 'ทำเนียบผู้สร้างสาธารณะ ไม่รวมชื่อจริงและช่องทางติดต่อส่วนตัว';

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using(
  user_id=auth.uid() or (
    user_id is null and audience_role in(
      select role from public.user_roles where user_id=auth.uid() and revoked_at is null
    )
  )
);

alter table public.creator_applications add constraint creator_applications_type_valid
  check(creator_type in ('teacher','student','game_creator','designer','other'));
alter table public.creator_commission_overrides add constraint creator_override_percent_bounds
  check(platform_percent between 0 and 100 and creator_percent between 0 and 100);
alter table public.order_items add constraint order_item_percent_snapshot_valid
  check(platform_commission_percent_snapshot between 0 and 100 and creator_commission_percent_snapshot between 0 and 100 and platform_commission_percent_snapshot+creator_commission_percent_snapshot=100);
alter table public.creator_earnings add constraint creator_earnings_amounts_valid
  check(gross_satang>=0 and creator_share_satang>=0 and platform_share_satang>=0 and creator_share_satang+platform_share_satang=gross_satang);

alter table public.media_secure_targets add column target_type text not null default 'primary' check(target_type in ('primary','backup'));
alter table public.media_secure_targets add column target_hash text;
drop index if exists public.media_secure_targets_one_active;
create unique index media_secure_targets_one_active_type on public.media_secure_targets(media_id,target_type) where active;
create index media_secure_targets_hash on public.media_secure_targets(target_hash) where active and target_hash is not null;
alter table public.orders add column checkout_key uuid;
create unique index orders_user_checkout_key on public.orders(user_id,checkout_key) where checkout_key is not null;
create unique index refunds_provider_reference on public.refunds(provider_refund_id) where provider_refund_id is not null;

create or replace function public.create_order_secure(p_user_id uuid,p_media_ids uuid[],p_checkout_key uuid)
returns table(order_id uuid,total_satang integer)
language plpgsql security definer set search_path=public as $$
declare v_order_id uuid:=gen_random_uuid();v_total integer:=0;v_min integer:=1000;v_media record;v_platform numeric(5,2);v_creator numeric(5,2);v_creator_share integer;v_new_orders boolean;v_existing public.orders%rowtype;v_media_id uuid;
begin
 if auth.role()<>'service_role' then raise exception 'server only'; end if;
 if p_user_id is null or p_checkout_key is null or coalesce(array_length(p_media_ids,1),0)=0 or array_length(p_media_ids,1)>50 then raise exception 'invalid cart'; end if;
 if cardinality(p_media_ids)<>(select count(distinct x) from unnest(p_media_ids) x) then raise exception 'duplicate media'; end if;
 select * into v_existing from public.orders where user_id=p_user_id and checkout_key=p_checkout_key;
 if found then return query select v_existing.id,v_existing.total_satang;return;end if;
 select enabled into v_new_orders from public.feature_flags where key='new_orders';
 if not coalesce(v_new_orders,false) then raise exception 'new orders disabled'; end if;
 foreach v_media_id in array (select array_agg(x order by x) from unnest(p_media_ids) x) loop
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||v_media_id::text,0));
 end loop;
 if exists(
  select 1 from public.order_items oi join public.orders o on o.id=oi.order_id
  where o.user_id=p_user_id and oi.media_id=any(p_media_ids) and o.status in ('pending','awaiting_payment') and o.created_at>now()-interval '30 minutes'
 ) then raise exception 'purchase already pending'; end if;
 select coalesce((value #>> '{}')::integer,1000) into v_min from public.system_settings where key='minimum_checkout_satang';
 insert into public.orders(id,user_id,status,subtotal_satang,total_satang,checkout_key) values(v_order_id,p_user_id,'pending',0,0,p_checkout_key);
 for v_media in
  select m.id,m.title_th,m.price_satang,m.creator_id,coalesce(cp.trust_level,'new') trust_level
  from public.media_items m left join public.creator_profiles cp on cp.user_id=m.creator_id
  where m.id=any(p_media_ids) and m.status='published' and m.access_type='paid' and m.price_satang>0 for share of m
 loop
  if v_media.creator_id is null then raise exception 'paid media has no creator'; end if;
  if exists(select 1 from public.entitlements where user_id=p_user_id and media_id=v_media.id and revoked_at is null) then raise exception 'media already owned'; end if;
  select o.platform_percent,o.creator_percent into v_platform,v_creator from public.creator_commission_overrides o where o.creator_id=v_media.creator_id and o.effective_from<=now() and (o.effective_to is null or o.effective_to>now()) order by o.effective_from desc limit 1;
  if v_platform is null then select r.platform_percent,r.creator_percent into v_platform,v_creator from public.commission_rules r where r.level=v_media.trust_level and r.effective_from<=now() and (r.effective_to is null or r.effective_to>now()) order by r.effective_from desc limit 1;end if;
  if v_platform is null or v_platform+v_creator<>100 then raise exception 'commission unavailable';end if;
  v_creator_share:=floor(v_media.price_satang*v_creator/100)::integer;
  insert into public.order_items(order_id,media_id,media_title_snapshot,unit_price_satang_snapshot,creator_id_snapshot,platform_commission_percent_snapshot,creator_commission_percent_snapshot,creator_share_satang_snapshot,platform_share_satang_snapshot)
  values(v_order_id,v_media.id,v_media.title_th,v_media.price_satang,v_media.creator_id,v_platform,v_creator,v_creator_share,v_media.price_satang-v_creator_share);
  v_total:=v_total+v_media.price_satang;
 end loop;
 if (select count(*) from public.order_items where order_id=v_order_id)<>cardinality(p_media_ids) then raise exception 'media unavailable';end if;
 if v_total<v_min then raise exception 'checkout minimum not met';end if;
 update public.orders set subtotal_satang=v_total,total_satang=v_total,status='awaiting_payment' where id=v_order_id;
 insert into public.admin_audit_logs(action,entity,entity_id,after_state,reason) values('order_created','order',v_order_id::text,jsonb_build_object('user_id',p_user_id,'total_satang',v_total,'checkout_key',p_checkout_key),'server-side pricing');
 return query select v_order_id,v_total;
end $$;
revoke all on function public.create_order_secure(uuid,uuid[],uuid) from public,anon,authenticated;
grant execute on function public.create_order_secure(uuid,uuid[],uuid) to service_role;
revoke all on function public.create_order_secure(uuid,uuid[]) from public,anon,authenticated,service_role;

create or replace function public.process_verified_payment_event(p_provider text,p_event_id text,p_provider_payment_id text,p_order_id uuid,p_status text,p_amount_satang integer,p_event_type text,p_payload_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_payment public.payments%rowtype;v_item record;v_event_pk uuid;v_hold_days integer:=14;v_creator_id uuid;
begin
 if auth.role()<>'service_role' then raise exception 'server only';end if;
 select * into v_payment from public.payments where provider=p_provider and provider_payment_id=p_provider_payment_id and order_id=p_order_id for update;
 if not found then raise exception 'payment mismatch';end if;
 insert into public.payment_webhook_events(provider,event_id,event_type,payload_hash,order_id,processing_status)
 values(p_provider,p_event_id,p_event_type,p_payload_hash,p_order_id,'received') on conflict(provider,event_id) do nothing returning id into v_event_pk;
 if v_event_pk is null then return jsonb_build_object('duplicate',true);end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.total_satang<>p_amount_satang or v_payment.amount_satang<>p_amount_satang then
  update public.payment_webhook_events set processing_status='rejected',processed_at=now(),error_code='amount_mismatch' where id=v_event_pk;
  return jsonb_build_object('accepted',false,'reason','amount_mismatch');
 end if;
 if p_status<>'paid' then
  if v_order.status in ('pending','awaiting_payment') and p_status in ('failed','expired') then update public.orders set status=p_status::public.order_status,updated_at=now() where id=p_order_id;end if;
  if v_payment.status not in ('paid','refunded') then update public.payments set status=case when p_status in ('pending','awaiting_payment','failed','expired') then p_status::public.order_status else 'failed' end,updated_at=now() where id=v_payment.id;end if;
  update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_pk;
  return jsonb_build_object('paid',false,'status',p_status);
 end if;
 if v_order.status='paid' then update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_pk;return jsonb_build_object('duplicate_order',true);end if;
 if v_order.status not in ('pending','awaiting_payment') then
  update public.payment_webhook_events set processing_status='rejected',processed_at=now(),error_code='terminal_order_state' where id=v_event_pk;
  return jsonb_build_object('accepted',false,'reason','terminal_order_state');
 end if;
 select coalesce((value #>> '{}')::integer,14) into v_hold_days from public.system_settings where key='creator_hold_days';
 update public.orders set status='paid',paid_at=now(),updated_at=now(),payment_provider=p_provider where id=p_order_id;
 update public.payments set status='paid',updated_at=now() where id=v_payment.id;
 for v_item in select * from public.order_items where order_id=p_order_id loop
  insert into public.entitlements(user_id,media_id,source,order_id) values(v_order.user_id,v_item.media_id,'purchase',p_order_id) on conflict(user_id,media_id) where revoked_at is null do nothing;
  insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,available_at) values(v_item.creator_id_snapshot,'sale_creator','on_hold',v_item.creator_share_satang_snapshot,'order_item',v_item.id,now()+make_interval(days=>v_hold_days)) on conflict do nothing;
  insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,available_at) values(null,'sale_platform','available',v_item.platform_share_satang_snapshot,'order_item',v_item.id,now()) on conflict do nothing;
  insert into public.creator_earnings(creator_id,order_item_id,gross_satang,creator_share_satang,platform_share_satang,available_at) values(v_item.creator_id_snapshot,v_item.id,v_item.unit_price_satang_snapshot,v_item.creator_share_satang_snapshot,v_item.platform_share_satang_snapshot,now()+make_interval(days=>v_hold_days)) on conflict(order_item_id) do nothing;
  update public.media_items set sales_count=sales_count+1 where id=v_item.media_id;
 end loop;
 for v_creator_id in select distinct creator_id_snapshot from public.order_items where order_id=p_order_id and creator_id_snapshot is not null loop perform public.refresh_creator_balance_cache(v_creator_id);end loop;
 delete from public.cart_items where cart_id in(select id from public.carts where user_id=v_order.user_id) and media_id in(select media_id from public.order_items where order_id=p_order_id);
 update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_pk;
 insert into public.admin_audit_logs(action,entity,entity_id,after_state,reason) values('payment_confirmed','order',p_order_id::text,jsonb_build_object('status','paid','amount_satang',p_amount_satang),'verified payment webhook');
 return jsonb_build_object('paid',true,'order_id',p_order_id);
end $$;
revoke all on function public.process_verified_payment_event(text,text,text,uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.process_verified_payment_event(text,text,text,uuid,text,integer,text,text) to service_role;
revoke all on function public.process_verified_payment_event(text,text,uuid,text,integer,text,text) from public,anon,authenticated,service_role;

create or replace function public.create_full_refund(p_order_id uuid,p_reason text,p_actor_id uuid,p_provider_refund_id text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_refund_id uuid:=gen_random_uuid();v_entry record;v_creator_id uuid;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','finance') and revoked_at is null) then raise exception 'not authorized';end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'paid' then raise exception 'order is not refundable';end if;
 if p_provider_refund_id is null or length(p_provider_refund_id)<3 then raise exception 'provider refund evidence required';end if;
 insert into public.refunds(id,order_id,payment_id,amount_satang,reason,status,provider_refund_id,created_by,completed_at)
 select v_refund_id,p_order_id,p.id,v_order.total_satang,p_reason,'refunded',p_provider_refund_id,p_actor_id,now() from public.payments p where p.order_id=p_order_id and p.status='paid' order by p.created_at desc limit 1;
 if not found then raise exception 'paid payment unavailable';end if;
 for v_entry in
  select l.* from public.financial_ledger_entries l join public.order_items oi on oi.id=l.reference_id
  where l.reference_type='order_item' and oi.order_id=p_order_id and l.kind in ('sale_creator','sale_platform')
    and not exists(select 1 from public.financial_ledger_entries r where r.reverses_entry_id=l.id)
 loop
  insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,reverses_entry_id,available_at,created_by)
  values(v_entry.creator_id,case when v_entry.kind='sale_creator' then 'refund_creator' else 'refund_platform' end,'available',-abs(v_entry.amount_satang),'refund',v_refund_id,v_entry.id,now(),p_actor_id);
 end loop;
 update public.orders set status='refunded',refunded_at=now(),updated_at=now() where id=p_order_id;
 update public.payments set status='refunded',updated_at=now() where order_id=p_order_id and status='paid';
 update public.entitlements set revoked_at=now(),revoke_reason='refund: '||p_reason where order_id=p_order_id and revoked_at is null;
 update public.creator_earnings set status='reversed' where order_item_id in(select id from public.order_items where order_id=p_order_id);
 update public.media_items m set sales_count=greatest(0,sales_count-1) where id in(select media_id from public.order_items where order_id=p_order_id);
 for v_creator_id in select distinct creator_id_snapshot from public.order_items where order_id=p_order_id and creator_id_snapshot is not null loop perform public.refresh_creator_balance_cache(v_creator_id);end loop;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'order_refunded','order',p_order_id::text,jsonb_build_object('status','paid'),jsonb_build_object('status','refunded','refund_id',v_refund_id,'provider_refund_id',p_provider_refund_id),p_reason);
 return v_refund_id;
end $$;
revoke all on function public.create_full_refund(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_full_refund(uuid,text,uuid,text) to service_role;
revoke all on function public.create_full_refund(uuid,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.record_manual_payout(p_creator_id uuid,p_ledger_entry_ids uuid[],p_external_reference text,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_payout_id uuid:=gen_random_uuid();v_total integer;v_min integer:=50000;v_count integer;v_available integer;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','finance') and revoked_at is null) then raise exception 'not authorized';end if;
 if cardinality(p_ledger_entry_ids)=0 or cardinality(p_ledger_entry_ids)<>(select count(distinct x) from unnest(p_ledger_entry_ids) x) then raise exception 'invalid payout items';end if;
 perform 1 from public.financial_ledger_entries where id=any(p_ledger_entry_ids) for update;
 select count(*),coalesce(sum(l.amount_satang),0)::integer into v_count,v_total
 from public.financial_ledger_entries l
 where l.id=any(p_ledger_entry_ids) and l.creator_id=p_creator_id and l.kind in ('sale_creator','adjustment') and l.available_at<=now() and l.amount_satang>0
 and not exists(select 1 from public.financial_ledger_entries r where r.reverses_entry_id=l.id)
 and not exists(select 1 from public.payout_items pi where pi.ledger_entry_id=l.id);
 if v_count<>cardinality(p_ledger_entry_ids) then raise exception 'ledger entries unavailable or reversed';end if;
 select coalesce(sum(amount_satang),0)::integer into v_available from public.financial_ledger_entries where creator_id=p_creator_id and available_at<=now();
 select coalesce((value #>> '{}')::integer,50000) into v_min from public.system_settings where key='minimum_payout_satang';
 if v_total<v_min or v_available<v_total then raise exception 'minimum payout or net balance not met';end if;
 insert into public.payouts(id,creator_id,amount_satang,status,method,external_reference,approved_by,paid_by,paid_at) values(v_payout_id,p_creator_id,v_total,'paid','manual',p_external_reference,p_actor_id,p_actor_id,now());
 insert into public.payout_items(payout_id,ledger_entry_id,amount_satang) select v_payout_id,id,amount_satang from public.financial_ledger_entries where id=any(p_ledger_entry_ids);
 insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,available_at,created_by,metadata) values(p_creator_id,'payout','paid',-v_total,'payout',v_payout_id,now(),p_actor_id,jsonb_build_object('external_reference',p_external_reference));
 perform public.refresh_creator_balance_cache(p_creator_id);
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,after_state,reason) values(p_actor_id,'manual_payout_recorded','payout',v_payout_id::text,jsonb_build_object('creator_id',p_creator_id,'amount_satang',v_total),'manual payout with external evidence');
 return v_payout_id;
end $$;
revoke all on function public.record_manual_payout(uuid,uuid[],text,uuid) from public,anon,authenticated;
grant execute on function public.record_manual_payout(uuid,uuid[],text,uuid) to service_role;

create or replace function public.approve_creator_application(p_application_id uuid,p_actor_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_app public.creator_applications%rowtype;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin') and revoked_at is null) then raise exception 'not authorized';end if;
 select * into v_app from public.creator_applications where id=p_application_id for update;
 if not found or v_app.status<>'pending' then raise exception 'application unavailable';end if;
 insert into public.creator_profiles(user_id,display_name,legal_name,creator_type,bio,contact_channels,status,seller_agreement_version,seller_agreement_accepted_at,approved_at)
 values(v_app.user_id,v_app.display_name,v_app.legal_name,v_app.creator_type,v_app.bio,v_app.contact_channels,'approved',v_app.seller_agreement_version,v_app.ownership_confirmed_at,now())
 on conflict(user_id) do update set display_name=excluded.display_name,legal_name=excluded.legal_name,creator_type=excluded.creator_type,bio=excluded.bio,contact_channels=excluded.contact_channels,status='approved',seller_agreement_version=excluded.seller_agreement_version,seller_agreement_accepted_at=excluded.seller_agreement_accepted_at,approved_at=now();
 insert into public.user_roles(user_id,role,granted_by) values(v_app.user_id,'creator',p_actor_id) on conflict(user_id,role) do update set revoked_at=null,granted_by=excluded.granted_by,granted_at=now();
 update public.creator_applications set status='approved',reviewed_by=p_actor_id,reviewed_at=now(),rejection_reason=null where id=p_application_id;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'creator_application_approved','creator_application',p_application_id::text,jsonb_build_object('status','pending'),jsonb_build_object('status','approved','user_id',v_app.user_id),p_reason);
 return v_app.user_id;
end $$;
revoke all on function public.approve_creator_application(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.approve_creator_application(uuid,uuid,text) to service_role;

create or replace function public.create_media_submission_secure(
 p_creator_id uuid,p_slug text,p_title_th text,p_description_th text,p_subject_id uuid,p_media_type_id uuid,p_grade_level_id uuid,p_access_type text,p_delivery_type text,p_price_satang integer,p_tags text[],p_ownership_evidence text,p_files jsonb,p_targets jsonb,p_reviews jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_media_id uuid:=gen_random_uuid();v_submission_id uuid:=gen_random_uuid();v_file record;v_target record;v_review record;v_upload_enabled boolean;
begin
 if auth.role()<>'service_role' then raise exception 'server only';end if;
 if not exists(select 1 from public.creator_profiles where user_id=p_creator_id and status in ('approved','verified','trusted')) then raise exception 'creator unavailable';end if;
 select enabled into v_upload_enabled from public.feature_flags where key='upload';if not coalesce(v_upload_enabled,false) then raise exception 'uploads disabled';end if;
 if p_delivery_type not in ('external_link','file','both') or p_access_type not in ('free','paid') then raise exception 'invalid delivery';end if;
 if p_delivery_type in ('file','both') and jsonb_array_length(coalesce(p_files,'[]'::jsonb))=0 then raise exception 'file required';end if;
 if p_delivery_type in ('external_link','both') and not exists(select 1 from jsonb_to_recordset(coalesce(p_targets,'[]'::jsonb)) as t(target_type text) where t.target_type='primary') then raise exception 'primary target required';end if;
 insert into public.media_items(id,slug,title_th,short_description_th,description_th,subject_id,media_type_id,creator_id,access_type,delivery_type,price_satang,status,tags)
 values(v_media_id,p_slug,p_title_th,left(p_description_th,240),p_description_th,p_subject_id,p_media_type_id,p_creator_id,p_access_type,p_delivery_type,p_price_satang,'reviewing',coalesce(p_tags,'{}'));
 insert into public.media_grade_levels(media_id,grade_level_id) values(v_media_id,p_grade_level_id);
 for v_file in select * from jsonb_to_recordset(coalesce(p_files,'[]'::jsonb)) as f(purpose text,storage_provider text,storage_file_id text,storage_path text,file_name text,mime_type text,file_size bigint,checksum text,safety_status text) loop
  if v_file.safety_status='unsafe' then raise exception 'unsafe file';end if;
  insert into public.media_files(media_id,purpose,storage_provider,storage_file_id,storage_path,file_name,mime_type,file_size,checksum,area,malware_status)
  values(v_media_id,v_file.purpose,v_file.storage_provider,v_file.storage_file_id,v_file.storage_path,v_file.file_name,v_file.mime_type,v_file.file_size,v_file.checksum,'temporary_review',coalesce(v_file.safety_status,'manual_review'));
 end loop;
 for v_target in select * from jsonb_to_recordset(coalesce(p_targets,'[]'::jsonb)) as t(target_type text,target_ciphertext text,target_iv text,target_hash text,source_platform text,verification_token text) loop
  insert into public.media_secure_targets(media_id,target_type,target_ciphertext,target_iv,target_hash,source_platform,verification_token,verification_method)
  values(v_media_id,v_target.target_type,v_target.target_ciphertext,v_target.target_iv,v_target.target_hash,coalesce(v_target.source_platform,'Other'),v_target.verification_token,'manual');
 end loop;
 insert into public.media_submissions(id,media_id,creator_id,status,ownership_evidence) values(v_submission_id,v_media_id,p_creator_id,'human_review',p_ownership_evidence);
 for v_review in select * from jsonb_to_recordset(coalesce(p_reviews,'[]'::jsonb)) as r(check_type text,provider text,model text,model_version text,input_hash text,risk public.risk_level,similarity numeric,urls_found jsonb,result jsonb,reason text,evidence jsonb) loop
  insert into public.media_review_results(submission_id,check_type,provider,model,model_version,input_hash,risk,similarity,urls_found,result,reason,evidence)
  values(v_submission_id,v_review.check_type,v_review.provider,v_review.model,v_review.model_version,v_review.input_hash,v_review.risk,v_review.similarity,coalesce(v_review.urls_found,'[]'),coalesce(v_review.result,'{}'),v_review.reason,coalesce(v_review.evidence,'[]'));
 end loop;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,after_state,reason) values(p_creator_id,'media_submitted','media',v_media_id::text,jsonb_build_object('status','reviewing','submission_id',v_submission_id),'creator submitted for human review');
 return v_media_id;
end $$;
revoke all on function public.create_media_submission_secure(uuid,text,text,text,uuid,uuid,uuid,text,text,integer,text[],text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_media_submission_secure(uuid,text,text,text,uuid,uuid,uuid,text,text,integer,text[],text,jsonb,jsonb,jsonb) to service_role;

create or replace function public.record_media_file_safety_decision(p_media_id uuid,p_file_id uuid,p_status text,p_reason text,p_actor_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_submission_id uuid;v_old text;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin','reviewer') and revoked_at is null) then raise exception 'not authorized';end if;
 if p_status not in ('clean','unsafe','manual_review') then raise exception 'invalid status';end if;
 select malware_status into v_old from public.media_files where id=p_file_id and media_id=p_media_id and area='temporary_review' for update;if not found then raise exception 'file unavailable';end if;
 select id into v_submission_id from public.media_submissions where media_id=p_media_id and status='human_review' order by submitted_at desc limit 1;
 update public.media_files set malware_status=p_status,area=case when p_status='unsafe' then 'rejected_retention' else area end,retention_until=case when p_status='unsafe' then now()+interval '14 days' else retention_until end where id=p_file_id;
 update public.media_review_results set admin_decision=case when p_status='clean' then 'accept' when p_status='unsafe' then 'reject' else 'request_more_information' end,decided_by=p_actor_id,decided_at=now() where submission_id=v_submission_id and check_type='file_safety' and result->>'storage_file_id'=(select storage_file_id from public.media_files where id=p_file_id);
 if p_status='unsafe' then update public.media_items set status='suspended' where id=p_media_id;update public.media_submissions set status='rejected',reviewed_by=p_actor_id,reviewed_at=now(),decision_reason=p_reason where id=v_submission_id;end if;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'file_safety_decision','media_file',p_file_id::text,jsonb_build_object('malware_status',v_old),jsonb_build_object('malware_status',p_status),p_reason);
end $$;
revoke all on function public.record_media_file_safety_decision(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.record_media_file_safety_decision(uuid,uuid,text,text,uuid) to service_role;

create or replace function public.record_media_risk_decision(p_result_id uuid,p_decision text,p_reason text,p_actor_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_before jsonb;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin','reviewer') and revoked_at is null) then raise exception 'not authorized';end if;
 if p_decision not in ('accept','reject','request_more_information') then raise exception 'invalid decision';end if;
 select to_jsonb(r) into v_before from public.media_review_results r where id=p_result_id for update;if not found then raise exception 'review result unavailable';end if;
 update public.media_review_results set admin_decision=p_decision,decided_by=p_actor_id,decided_at=now(),result=result||jsonb_build_object('admin_reason',p_reason) where id=p_result_id;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'media_risk_decision','media_review_result',p_result_id::text,v_before,jsonb_build_object('admin_decision',p_decision),p_reason);
end $$;
revoke all on function public.record_media_risk_decision(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.record_media_risk_decision(uuid,text,text,uuid) to service_role;

create or replace function public.finalize_media_approval(p_media_id uuid,p_moved_files jsonb,p_actor_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_submission public.media_submissions%rowtype;v_move record;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin','reviewer') and revoked_at is null) then raise exception 'not authorized';end if;
 select * into v_submission from public.media_submissions where media_id=p_media_id and status='human_review' order by submitted_at desc limit 1 for update;if not found then raise exception 'submission unavailable';end if;
 if exists(select 1 from public.media_files where media_id=p_media_id and active and malware_status<>'clean') then raise exception 'file safety unresolved';end if;
 if exists(select 1 from public.media_review_results where submission_id=v_submission.id and risk<>'LOW' and coalesce(admin_decision,'')<>'accept') then raise exception 'risk decision unresolved';end if;
 for v_move in select * from jsonb_to_recordset(coalesce(p_moved_files,'[]'::jsonb)) as m(file_id uuid,storage_path text) loop update public.media_files set area='permanent',storage_path=v_move.storage_path,retention_until=null where id=v_move.file_id and media_id=p_media_id;end loop;
 update public.media_items set status='published',published_at=coalesce(published_at,now()),updated_at=now() where id=p_media_id;
 update public.media_submissions set status='approved',reviewed_by=p_actor_id,reviewed_at=now(),decision_reason=p_reason where id=v_submission.id;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'media_approved','media',p_media_id::text,jsonb_build_object('status','reviewing'),jsonb_build_object('status','published'),p_reason);
end $$;
revoke all on function public.finalize_media_approval(uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.finalize_media_approval(uuid,jsonb,uuid,text) to service_role;

create or replace function public.hold_copyright_claim(p_claim_id uuid,p_actor_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_claim public.copyright_claims%rowtype;v_creator uuid;v_before text;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin','moderator') and revoked_at is null) then raise exception 'not authorized';end if;
 select * into v_claim from public.copyright_claims where id=p_claim_id for update;if not found then raise exception 'claim unavailable';end if;v_before:=v_claim.status;
 if v_claim.media_id is not null then select creator_id into v_creator from public.media_items where id=v_claim.media_id;update public.media_items set status='suspended',updated_at=now() where id=v_claim.media_id and status in ('published','degraded');end if;
 update public.copyright_claims set status='awaiting_creator',assigned_to=p_actor_id,updated_at=now() where id=p_claim_id;
 if v_creator is not null then insert into public.notifications(user_id,title_th,body_th,type) values(v_creator,'สื่อถูกพักเพื่อตรวจคำร้องลิขสิทธิ์','กรุณาส่งหลักฐานสิทธิ์ผ่านระบบภายในเวลาที่กำหนด','copyright_hold');end if;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'copyright_claim_hold','copyright_claim',p_claim_id::text,jsonb_build_object('status',v_before),jsonb_build_object('status','awaiting_creator','media_id',v_claim.media_id),p_reason);
end $$;
revoke all on function public.hold_copyright_claim(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.hold_copyright_claim(uuid,uuid,text) to service_role;

create or replace function public.add_copyright_counter_evidence(p_claim_id uuid,p_creator_id uuid,p_evidence jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_evidence_id uuid:=gen_random_uuid();
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.copyright_claims c join public.media_items m on m.id=c.media_id where c.id=p_claim_id and m.creator_id=p_creator_id and c.status='awaiting_creator') then raise exception 'not authorized';end if;
 insert into public.copyright_evidence(id,claim_id,submitted_by,source,storage_provider,storage_file_id,storage_path,description,checksum) values(v_evidence_id,p_claim_id,p_creator_id,'creator_counter_evidence',p_evidence->>'storage_provider',p_evidence->>'storage_file_id',p_evidence->>'storage_path',p_evidence->>'description',p_evidence->>'checksum');
 update public.copyright_claims set status='decision',updated_at=now() where id=p_claim_id;
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,after_state,reason) values(p_creator_id,'copyright_counter_evidence_added','copyright_claim',p_claim_id::text,jsonb_build_object('evidence_id',v_evidence_id,'status','decision'),'creator submitted counter evidence');
 return v_evidence_id;
end $$;
revoke all on function public.add_copyright_counter_evidence(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.add_copyright_counter_evidence(uuid,uuid,jsonb) to service_role;

create or replace function public.decide_copyright_claim(p_claim_id uuid,p_decision text,p_actor_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_claim public.copyright_claims%rowtype;v_creator uuid;v_before jsonb;v_after jsonb;
begin
 if auth.role()<>'service_role' or not exists(select 1 from public.user_roles where user_id=p_actor_id and role in ('owner','admin','moderator') and revoked_at is null) then raise exception 'not authorized';end if;
 if p_decision not in ('restore','remove','request_more_information','suspend_creator') then raise exception 'invalid decision';end if;
 select * into v_claim from public.copyright_claims where id=p_claim_id for update;if not found then raise exception 'claim unavailable';end if;v_before:=to_jsonb(v_claim);
 if v_claim.media_id is not null then select creator_id into v_creator from public.media_items where id=v_claim.media_id;end if;
 if p_decision='restore' then update public.media_items set status='published',updated_at=now() where id=v_claim.media_id;update public.copyright_claims set status='restored',updated_at=now() where id=p_claim_id;
 elsif p_decision='remove' then update public.media_items set status='archived',updated_at=now() where id=v_claim.media_id;update public.copyright_claims set status='removed',updated_at=now() where id=p_claim_id;
 elsif p_decision='request_more_information' then update public.copyright_claims set status='awaiting_creator',updated_at=now() where id=p_claim_id;
 else update public.creator_profiles set status='suspended',updated_at=now() where user_id=v_creator;update public.media_items set status='suspended',updated_at=now() where creator_id=v_creator and status in ('published','degraded','reviewing');update public.copyright_claims set status='removed',updated_at=now() where id=p_claim_id;insert into public.creator_strikes(creator_id,strike_type,severity,action,reason,source_entity,source_entity_id,issued_by) values(v_creator,'copyright',3,'temporary_suspend',p_reason,'copyright_claim',p_claim_id,p_actor_id);end if;
 select to_jsonb(c) into v_after from public.copyright_claims c where id=p_claim_id;
 insert into public.copyright_decisions(claim_id,decision,reason,decided_by,before_state,after_state) values(p_claim_id,p_decision,p_reason,p_actor_id,v_before,v_after);
 insert into public.admin_audit_logs(actor_id,action,entity,entity_id,before_state,after_state,reason) values(p_actor_id,'copyright_claim_decided','copyright_claim',p_claim_id::text,v_before,v_after,p_reason);
end $$;
revoke all on function public.decide_copyright_claim(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.decide_copyright_claim(uuid,text,uuid,text) to service_role;

-- Historical marketplace and financial records are never hard-deleted.
create or replace function public.prevent_historical_delete() returns trigger language plpgsql as $$ begin raise exception 'historical records cannot be deleted';end $$;
create trigger orders_no_delete before delete on public.orders for each row execute function public.prevent_historical_delete();
create trigger payments_no_delete before delete on public.payments for each row execute function public.prevent_historical_delete();
create trigger entitlements_no_delete before delete on public.entitlements for each row execute function public.prevent_historical_delete();
create or replace function public.prevent_sold_media_delete() returns trigger language plpgsql as $$ begin if exists(select 1 from public.order_items where media_id=old.id) then raise exception 'sold media cannot be deleted';end if;return old;end $$;
create trigger sold_media_no_delete before delete on public.media_items for each row execute function public.prevent_sold_media_delete();

comment on table public.media_grade_levels is 'ความสัมพันธ์หลายต่อหลายระหว่างสื่อและระดับชั้น';
comment on table public.media_previews is 'ภาพ/หน้าตัวอย่างสื่อที่เปิดเผยได้หลังผ่านการตรวจ';
comment on table public.favorites is 'รายการสื่อที่ผู้ใช้บันทึกไว้ส่วนตัว';
comment on table public.carts is 'ตะกร้าหนึ่งใบต่อผู้ใช้';
comment on table public.cart_items is 'รายการสื่อในตะกร้า ราคาไม่ใช่ source of truth';
comment on table public.creator_reviews is 'รีวิวผู้สร้างที่ผ่านกระบวนการกำกับดูแล';
comment on table public.media_reviews is 'รีวิวสื่อที่ผ่านกระบวนการกำกับดูแล';
comment on table public.media_reports is 'รายงานปัญหาสื่อทั่วไปที่ไม่ใช่คำร้องลิขสิทธิ์';
comment on column public.orders.checkout_key is 'คีย์ idempotency ฝั่ง client ต่อความพยายาม checkout';
comment on column public.media_secure_targets.target_hash is 'SHA-256 ของ canonical URL สำหรับตรวจซ้ำ โดยไม่เผย URL จริง';

commit;
