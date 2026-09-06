begin;

create or replace function public.bootstrap_owner_role(p_user_id uuid,p_expected_email text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actual_email text;
  v_inserted integer;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  select lower(email) into v_actual_email from auth.users where id=p_user_id;
  if v_actual_email is null or v_actual_email<>lower(trim(p_expected_email)) then
    raise exception 'owner identity mismatch';
  end if;

  insert into public.user_roles(user_id,role,granted_by)
  values(p_user_id,'owner',p_user_id)
  on conflict(user_id,role) do nothing;
  get diagnostics v_inserted=row_count;

  if v_inserted=0 then return false; end if;
  insert into public.admin_audit_logs(actor_id,action,entity,entity_id,after_state,reason)
  values(p_user_id,'bootstrap_owner','user',p_user_id::text,jsonb_build_object('role','owner'),'BOOTSTRAP_ADMIN_EMAIL login ครั้งแรก');
  return true;
end $$;

revoke all on function public.bootstrap_owner_role(uuid,text) from public,anon,authenticated;
grant execute on function public.bootstrap_owner_role(uuid,text) to service_role;
comment on function public.bootstrap_owner_role(uuid,text) is 'สร้างสิทธิ์เจ้าของระบบครั้งแรกและบันทึกประวัติในธุรกรรมเดียว ตรวจอีเมลกับ auth.users ฝั่งเซิร์ฟเวอร์';

create or replace function public.database_security_audit()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  select jsonb_build_object(
    'tables', (select count(*) from pg_catalog.pg_tables where schemaname='public'),
    'rls_tables', (
      select count(*)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relrowsecurity
    ),
    'policies', (select count(*) from pg_catalog.pg_policies where schemaname='public'),
    'indexes', (select count(*) from pg_catalog.pg_indexes where schemaname='public'),
    'commented_tables', (
      select count(*)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and pg_catalog.obj_description(c.oid,'pg_class') is not null
    ),
    'views', (select count(*) from pg_catalog.pg_views where schemaname='public')
  ) into v_result;
  return v_result;
end $$;

revoke all on function public.database_security_audit() from public,anon,authenticated;
grant execute on function public.database_security_audit() to service_role;
comment on function public.database_security_audit() is 'สรุปจำนวนตาราง RLS policy index comment และ view สำหรับตรวจหลัง migration เรียกได้เฉพาะฝั่งเซิร์ฟเวอร์';

commit;
