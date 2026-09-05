begin;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger subjects_updated before update on public.subjects for each row execute function public.set_updated_at();
create trigger grades_updated before update on public.grade_levels for each row execute function public.set_updated_at();
create trigger media_types_updated before update on public.media_types for each row execute function public.set_updated_at();
create trigger creator_profiles_updated before update on public.creator_profiles for each row execute function public.set_updated_at();
create trigger media_items_updated before update on public.media_items for each row execute function public.set_updated_at();
create trigger secure_targets_updated before update on public.media_secure_targets for each row execute function public.set_updated_at();
create trigger carts_updated before update on public.carts for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();
create trigger claims_updated before update on public.copyright_claims for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','')) on conflict do nothing;
  insert into public.user_roles(user_id,role) values(new.id,'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.has_role(required public.app_role) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid() and role in (required,'owner') and revoked_at is null)
$$;

create or replace function public.immutable_financial_records() returns trigger language plpgsql as $$ begin raise exception 'financial ledger entries are immutable'; end $$;
create trigger ledger_immutable before update or delete on public.financial_ledger_entries for each row execute function public.immutable_financial_records();
create or replace function public.immutable_audit_records() returns trigger language plpgsql as $$ begin raise exception 'admin audit logs are append-only'; end $$;
create trigger audit_immutable before update or delete on public.admin_audit_logs for each row execute function public.immutable_audit_records();

create or replace function public.create_order_secure(p_user_id uuid,p_media_ids uuid[])
returns table(order_id uuid,total_satang integer)
language plpgsql security definer set search_path=public as $$
declare v_order_id uuid:=gen_random_uuid();v_total integer:=0;v_min integer:=1000;v_media record;v_platform numeric(5,2);v_creator numeric(5,2);v_creator_share integer;v_new_orders boolean;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  if p_user_id is null or coalesce(array_length(p_media_ids,1),0)=0 or array_length(p_media_ids,1)>50 then raise exception 'invalid cart'; end if;
  if cardinality(p_media_ids)<>(select count(distinct x) from unnest(p_media_ids) x) then raise exception 'duplicate media'; end if;
  select enabled into v_new_orders from public.feature_flags where key='new_orders';
  if not coalesce(v_new_orders,false) then raise exception 'new orders disabled'; end if;
  select coalesce((value #>> '{}')::integer,1000) into v_min from public.system_settings where key='minimum_checkout_satang';
  insert into public.orders(id,user_id,status,subtotal_satang,total_satang) values(v_order_id,p_user_id,'pending',0,0);
  for v_media in
    select m.id,m.title_th,m.price_satang,m.creator_id,coalesce(cp.trust_level,'new') trust_level
    from public.media_items m left join public.creator_profiles cp on cp.user_id=m.creator_id
    where m.id=any(p_media_ids) and m.status='published' and m.access_type='paid' and m.price_satang>0
    for share of m
  loop
    if v_media.creator_id is null then raise exception 'paid media has no creator'; end if;
    if exists(select 1 from public.entitlements where user_id=p_user_id and media_id=v_media.id and revoked_at is null) then raise exception 'media already owned'; end if;
    select o.platform_percent,o.creator_percent into v_platform,v_creator
      from public.creator_commission_overrides o where o.creator_id=v_media.creator_id and o.effective_from<=now() and (o.effective_to is null or o.effective_to>now()) order by o.effective_from desc limit 1;
    if v_platform is null then select r.platform_percent,r.creator_percent into v_platform,v_creator from public.commission_rules r where r.level=v_media.trust_level and r.effective_from<=now() and (r.effective_to is null or r.effective_to>now()) order by r.effective_from desc limit 1; end if;
    if v_platform is null or v_platform+v_creator<>100 then raise exception 'commission unavailable'; end if;
    v_creator_share:=floor(v_media.price_satang*v_creator/100)::integer;
    insert into public.order_items(order_id,media_id,media_title_snapshot,unit_price_satang_snapshot,creator_id_snapshot,platform_commission_percent_snapshot,creator_commission_percent_snapshot,creator_share_satang_snapshot,platform_share_satang_snapshot)
    values(v_order_id,v_media.id,v_media.title_th,v_media.price_satang,v_media.creator_id,v_platform,v_creator,v_creator_share,v_media.price_satang-v_creator_share);
    v_total:=v_total+v_media.price_satang;
  end loop;
  if (select count(*) from public.order_items where order_id=v_order_id)<>cardinality(p_media_ids) then raise exception 'media unavailable'; end if;
  if v_total<v_min then raise exception 'checkout minimum not met'; end if;
  update public.orders set subtotal_satang=v_total,total_satang=v_total,status='awaiting_payment' where id=v_order_id;
  insert into public.admin_audit_logs(action,entity,entity_id,after_state,reason) values('order_created','order',v_order_id::text,jsonb_build_object('user_id',p_user_id,'total_satang',v_total),'server-side pricing');
  return query select v_order_id,v_total;
end $$;
revoke all on function public.create_order_secure(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.create_order_secure(uuid,uuid[]) to service_role;

create or replace function public.process_verified_payment_event(p_event_id text,p_provider_payment_id text,p_order_id uuid,p_status text,p_amount_satang integer,p_event_type text,p_payload_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_payment public.payments%rowtype;v_item record;v_event_pk uuid;v_hold_days integer:=14;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  select * into v_payment from public.payments where provider_payment_id=p_provider_payment_id for update;
  if not found or v_payment.order_id<>p_order_id then raise exception 'payment mismatch'; end if;
  insert into public.payment_webhook_events(provider,event_id,event_type,payload_hash,order_id,processing_status)
  values(v_payment.provider,p_event_id,p_event_type,p_payload_hash,p_order_id,'received') on conflict(provider,event_id) do nothing returning id into v_event_pk;
  if v_event_pk is null then return jsonb_build_object('duplicate',true); end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.total_satang<>p_amount_satang or v_payment.amount_satang<>p_amount_satang then
    update public.payment_webhook_events set processing_status='rejected',processed_at=now(),error_code='amount_mismatch' where id=v_event_pk;
    raise exception 'amount mismatch';
  end if;
  if p_status<>'paid' then
    update public.payments set status=case when p_status in ('pending','awaiting_payment','failed','expired','refunded') then p_status::public.order_status else 'failed' end where id=v_payment.id;
    update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_pk;
    return jsonb_build_object('paid',false,'status',p_status);
  end if;
  if v_order.status='paid' then update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_pk;return jsonb_build_object('duplicate_order',true);end if;
  select coalesce((value #>> '{}')::integer,14) into v_hold_days from public.system_settings where key='creator_hold_days';
  update public.orders set status='paid',paid_at=now() where id=p_order_id;
  update public.payments set status='paid',updated_at=now() where id=v_payment.id;
  for v_item in select * from public.order_items where order_id=p_order_id loop
    insert into public.entitlements(user_id,media_id,source,order_id) values(v_order.user_id,v_item.media_id,'purchase',p_order_id) on conflict(user_id,media_id) where revoked_at is null do nothing;
    insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,available_at)
      select v_item.creator_id_snapshot,'sale_creator','on_hold',v_item.creator_share_satang_snapshot,'order_item',v_item.id,now()+make_interval(days=>v_hold_days)
      where not exists(select 1 from public.financial_ledger_entries where kind='sale_creator' and reference_type='order_item' and reference_id=v_item.id);
    insert into public.financial_ledger_entries(creator_id,kind,status,amount_satang,reference_type,reference_id,available_at)
      select null,'sale_platform','available',v_item.platform_share_satang_snapshot,'order_item',v_item.id,now()
      where not exists(select 1 from public.financial_ledger_entries where kind='sale_platform' and reference_type='order_item' and reference_id=v_item.id);
    insert into public.creator_earnings(creator_id,order_item_id,gross_satang,creator_share_satang,platform_share_satang,available_at)
      values(v_item.creator_id_snapshot,v_item.id,v_item.unit_price_satang_snapshot,v_item.creator_share_satang_snapshot,v_item.platform_share_satang_snapshot,now()+make_interval(days=>v_hold_days)) on conflict(order_item_id) do nothing;
    update public.media_items set sales_count=sales_count+1 where id=v_item.media_id;
  end loop;
  update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_pk;
  insert into public.admin_audit_logs(action,entity,entity_id,after_state,reason) values('payment_confirmed','order',p_order_id::text,jsonb_build_object('status','paid','amount_satang',p_amount_satang),'verified payment webhook');
  return jsonb_build_object('paid',true,'order_id',p_order_id);
end $$;
revoke all on function public.process_verified_payment_event(text,text,uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.process_verified_payment_event(text,text,uuid,text,integer,text,text) to service_role;

do $$ declare t text; begin
  foreach t in array array['profiles','roles','user_roles','subjects','grade_levels','media_types','creator_profiles','creator_applications','creator_verifications','creator_trust_history','media_items','media_grade_levels','media_previews','media_secure_targets','media_files','media_versions','favorites','carts','cart_items','commission_rules','creator_commission_overrides','orders','order_items','payments','payment_webhook_events','entitlements','financial_ledger_entries','creator_earnings','creator_balances','payouts','payout_items','refunds','media_submissions','media_review_results','creator_reviews','media_reviews','creator_strikes','copyright_claims','copyright_evidence','copyright_decisions','media_reports','game_launch_logs','download_logs','media_view_logs','link_health_checks','link_url_history','platform_incidents','system_settings','feature_flags','admin_audit_logs','notifications','health_check_results','background_job_runs','ai_usage_events'] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

create policy profiles_self_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy roles_authenticated_read on public.roles for select to authenticated using(true);
create policy user_roles_self_read on public.user_roles for select to authenticated using(user_id=auth.uid());
create policy subjects_public_read on public.subjects for select to anon,authenticated using(active);
create policy grades_public_read on public.grade_levels for select to anon,authenticated using(active);
create policy media_types_public_read on public.media_types for select to anon,authenticated using(active);
create policy creators_public_read on public.creator_profiles for select to anon,authenticated using(status in ('approved','verified','trusted'));
create policy creator_own_read on public.creator_profiles for select to authenticated using(user_id=auth.uid());
create policy creator_app_own on public.creator_applications for select to authenticated using(user_id=auth.uid());
create policy creator_app_insert on public.creator_applications for insert to authenticated with check(user_id=auth.uid());
create policy media_public_read on public.media_items for select to anon,authenticated using(status in ('published','degraded'));
create policy media_creator_read on public.media_items for select to authenticated using(creator_id=auth.uid());
create policy grades_media_public on public.media_grade_levels for select to anon,authenticated using(exists(select 1 from public.media_items m where m.id=media_id and m.status in ('published','degraded')));
create policy previews_public on public.media_previews for select to anon,authenticated using(exists(select 1 from public.media_items m where m.id=media_id and m.status in ('published','degraded')));
-- media_secure_targets and media_files intentionally have no client policies.
create policy favorites_own_all on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy carts_own_all on public.carts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cart_items_own_all on public.cart_items for all to authenticated using(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid())) with check(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
create policy orders_own_read on public.orders for select to authenticated using(user_id=auth.uid());
create policy order_items_own_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy payments_own_read on public.payments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy entitlements_own_read on public.entitlements for select to authenticated using(user_id=auth.uid());
create policy creator_earnings_own on public.creator_earnings for select to authenticated using(creator_id=auth.uid());
create policy creator_balances_own on public.creator_balances for select to authenticated using(creator_id=auth.uid());
create policy ledger_creator_own on public.financial_ledger_entries for select to authenticated using(creator_id=auth.uid());
create policy payout_creator_own on public.payouts for select to authenticated using(creator_id=auth.uid());
create policy submission_creator_own on public.media_submissions for select to authenticated using(creator_id=auth.uid());
create policy submission_results_creator_read on public.media_review_results for select to authenticated using(exists(select 1 from public.media_submissions s where s.id=submission_id and s.creator_id=auth.uid()));
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid() or audience_role in(select role from public.user_roles where user_id=auth.uid() and revoked_at is null));
create policy creator_reviews_public on public.creator_reviews for select to anon,authenticated using(status='published');
create policy media_reviews_public on public.media_reviews for select to anon,authenticated using(status='published');

commit;
