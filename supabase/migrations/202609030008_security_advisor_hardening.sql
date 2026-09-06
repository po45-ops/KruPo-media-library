begin;

-- Public catalog data is served by KruPo's server repository. Keep the view
-- invoker-safe and do not expose its protected base table through PostgREST.
alter view public.creator_directory set (security_invoker = true);
revoke all on public.creator_directory from public, anon, authenticated;
grant select on public.creator_directory to service_role;

-- Trigger/event-trigger helpers must not be callable as REST RPCs. Revoking
-- EXECUTE does not affect their already-bound triggers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(public.app_role) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.immutable_financial_records() from public, anon, authenticated;
revoke execute on function public.immutable_audit_records() from public, anon, authenticated;
revoke execute on function public.prevent_historical_delete() from public, anon, authenticated;
revoke execute on function public.prevent_sold_media_delete() from public, anon, authenticated;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Resolve mutable search_path warnings without changing function bodies.
alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.handle_new_user() set search_path = pg_catalog;
alter function public.has_role(public.app_role) set search_path = pg_catalog;
alter function public.immutable_financial_records() set search_path = pg_catalog;
alter function public.immutable_audit_records() set search_path = pg_catalog;
alter function public.prevent_historical_delete() set search_path = pg_catalog;
alter function public.prevent_sold_media_delete() set search_path = pg_catalog;

-- Both extensions are relocatable. Existing trigram indexes retain their
-- object dependencies while future SQL resolves extension objects from the
-- project's configured extensions search path.
alter extension pg_trgm set schema extensions;
alter extension citext set schema extensions;

-- Preserve every access rule while caching auth.uid() once per statement.
alter policy profiles_self_read on public.profiles
  using (id = (select auth.uid()));
alter policy profiles_self_update on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
alter policy user_roles_self_read on public.user_roles
  using (user_id = (select auth.uid()));
alter policy creator_own_read on public.creator_profiles
  using (user_id = (select auth.uid()));
alter policy creator_app_own on public.creator_applications
  using (user_id = (select auth.uid()));
alter policy creator_app_insert on public.creator_applications
  with check (user_id = (select auth.uid()));

-- Avoid two permissive SELECT policies for the authenticated role.
drop policy media_public_read on public.media_items;
drop policy media_creator_read on public.media_items;
create policy media_public_read on public.media_items for select to anon
  using (status in ('published','degraded'));
create policy media_authenticated_read on public.media_items for select to authenticated
  using (status in ('published','degraded') or creator_id = (select auth.uid()));

alter policy favorites_own_all on public.favorites
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy carts_own_all on public.carts
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy cart_items_own_all on public.cart_items
  using (exists(select 1 from public.carts c where c.id=cart_id and c.user_id=(select auth.uid())))
  with check (exists(select 1 from public.carts c where c.id=cart_id and c.user_id=(select auth.uid())));
alter policy orders_own_read on public.orders
  using (user_id = (select auth.uid()));
alter policy order_items_own_read on public.order_items
  using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
alter policy payments_own_read on public.payments
  using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
alter policy entitlements_own_read on public.entitlements
  using (user_id = (select auth.uid()));
alter policy creator_earnings_own on public.creator_earnings
  using (creator_id = (select auth.uid()));
alter policy creator_balances_own on public.creator_balances
  using (creator_id = (select auth.uid()));
alter policy ledger_creator_own on public.financial_ledger_entries
  using (creator_id = (select auth.uid()));
alter policy payout_creator_own on public.payouts
  using (creator_id = (select auth.uid()));
alter policy submission_creator_own on public.media_submissions
  using (creator_id = (select auth.uid()));
alter policy submission_results_creator_read on public.media_review_results
  using (exists(select 1 from public.media_submissions s where s.id=submission_id and s.creator_id=(select auth.uid())));
alter policy notifications_own on public.notifications
  using (
    user_id = (select auth.uid())
    or (
      user_id is null
      and audience_role in (
        select role from public.user_roles
        where user_id = (select auth.uid()) and revoked_at is null
      )
    )
  );

-- No-policy tables are intentionally server-only. Explicit revokes document
-- deny-all client posture while service_role continues to use server flows.
revoke all on
  public.admin_audit_logs,
  public.ai_usage_events,
  public.background_job_runs,
  public.commission_rules,
  public.copyright_claims,
  public.copyright_decisions,
  public.copyright_evidence,
  public.creator_commission_overrides,
  public.creator_strikes,
  public.creator_trust_history,
  public.creator_verifications,
  public.download_logs,
  public.feature_flags,
  public.game_launch_logs,
  public.health_check_results,
  public.link_health_checks,
  public.link_url_history,
  public.media_files,
  public.media_reports,
  public.media_secure_targets,
  public.media_versions,
  public.media_view_logs,
  public.payment_webhook_events,
  public.payout_items,
  public.platform_incidents,
  public.refunds,
  public.system_settings
from anon, authenticated;

create or replace function public.database_security_audit()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  select jsonb_build_object(
    'tables', (select count(*) from pg_catalog.pg_tables where schemaname='public'),
    'rls_tables', (
      select count(*) from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relrowsecurity
    ),
    'policies', (select count(*) from pg_catalog.pg_policies where schemaname='public'),
    'indexes', (select count(*) from pg_catalog.pg_indexes where schemaname='public'),
    'commented_tables', (
      select count(*) from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and pg_catalog.obj_description(c.oid,'pg_class') is not null
    ),
    'views', (select count(*) from pg_catalog.pg_views where schemaname='public'),
    'security_invoker_views', (
      select count(*) from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='v' and 'security_invoker=true'=any(coalesce(c.reloptions,'{}'))
    ),
    'client_executable_sensitive_functions', (
      select count(*) from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname in ('handle_new_user','has_role','rls_auto_enable')
        and (
          pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
          or pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
        )
    )
  ) into v_result;
  return v_result;
end $$;

revoke all on function public.database_security_audit() from public,anon,authenticated;
grant execute on function public.database_security_audit() to service_role;

comment on view public.creator_directory is 'ทำเนียบผู้สร้างสำหรับ repository ฝั่งเซิร์ฟเวอร์ ใช้ security invoker และไม่เปิดตรงแก่ client';
comment on function public.database_security_audit() is 'สรุปสัญญาความปลอดภัย runtime หลัง Security Advisor hardening เรียกได้เฉพาะฝั่งเซิร์ฟเวอร์';

commit;
