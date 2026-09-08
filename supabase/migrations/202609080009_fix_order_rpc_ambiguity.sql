begin;

create or replace function public.create_order_secure(
  p_user_id uuid,
  p_media_ids uuid[],
  p_checkout_key uuid
)
returns table(order_id uuid,total_satang integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order_id uuid:=gen_random_uuid();
  v_total integer:=0;
  v_min integer:=1000;
  v_media record;
  v_platform numeric(5,2);
  v_creator numeric(5,2);
  v_creator_share integer;
  v_new_orders boolean;
  v_existing public.orders%rowtype;
  v_media_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'server only'; end if;
  if p_user_id is null or p_checkout_key is null or coalesce(array_length(p_media_ids,1),0)=0 or array_length(p_media_ids,1)>50 then raise exception 'invalid cart'; end if;
  if cardinality(p_media_ids)<>(select count(distinct x) from unnest(p_media_ids) x) then raise exception 'duplicate media'; end if;

  select * into v_existing from public.orders where user_id=p_user_id and checkout_key=p_checkout_key;
  if found then
    return query select v_existing.id,v_existing.total_satang;
    return;
  end if;

  select enabled into v_new_orders from public.feature_flags where key='new_orders';
  if not coalesce(v_new_orders,false) then raise exception 'new orders disabled'; end if;

  foreach v_media_id in array (select array_agg(x order by x) from unnest(p_media_ids) x) loop
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||v_media_id::text,0));
  end loop;

  if exists(
    select 1 from public.order_items oi
    join public.orders o on o.id=oi.order_id
    where o.user_id=p_user_id
      and oi.media_id=any(p_media_ids)
      and o.status in ('pending','awaiting_payment')
      and o.created_at>now()-interval '30 minutes'
  ) then raise exception 'purchase already pending'; end if;

  select coalesce((value #>> '{}')::integer,1000)
    into v_min
    from public.system_settings
    where key='minimum_checkout_satang';

  insert into public.orders(id,user_id,status,subtotal_satang,total_satang,checkout_key)
  values(v_order_id,p_user_id,'pending',0,0,p_checkout_key);

  for v_media in
    select m.id,m.title_th,m.price_satang,m.creator_id,coalesce(cp.trust_level,'new') trust_level
    from public.media_items m
    left join public.creator_profiles cp on cp.user_id=m.creator_id
    where m.id=any(p_media_ids)
      and m.status='published'
      and m.access_type='paid'
      and m.price_satang>0
    for share of m
  loop
    if v_media.creator_id is null then raise exception 'paid media has no creator'; end if;
    if exists(select 1 from public.entitlements where user_id=p_user_id and media_id=v_media.id and revoked_at is null) then raise exception 'media already owned'; end if;

    select o.platform_percent,o.creator_percent
      into v_platform,v_creator
      from public.creator_commission_overrides o
      where o.creator_id=v_media.creator_id
        and o.effective_from<=now()
        and (o.effective_to is null or o.effective_to>now())
      order by o.effective_from desc
      limit 1;

    if v_platform is null then
      select r.platform_percent,r.creator_percent
        into v_platform,v_creator
        from public.commission_rules r
        where r.level=v_media.trust_level
          and r.effective_from<=now()
          and (r.effective_to is null or r.effective_to>now())
        order by r.effective_from desc
        limit 1;
    end if;

    if v_platform is null or v_platform+v_creator<>100 then raise exception 'commission unavailable'; end if;
    v_creator_share:=floor(v_media.price_satang*v_creator/100)::integer;

    insert into public.order_items(
      order_id,media_id,media_title_snapshot,unit_price_satang_snapshot,creator_id_snapshot,
      platform_commission_percent_snapshot,creator_commission_percent_snapshot,
      creator_share_satang_snapshot,platform_share_satang_snapshot
    ) values(
      v_order_id,v_media.id,v_media.title_th,v_media.price_satang,v_media.creator_id,
      v_platform,v_creator,v_creator_share,v_media.price_satang-v_creator_share
    );
    v_total:=v_total+v_media.price_satang;
  end loop;

  if (select count(*) from public.order_items oi where oi.order_id=v_order_id)<>cardinality(p_media_ids) then raise exception 'media unavailable'; end if;
  if v_total<v_min then raise exception 'checkout minimum not met'; end if;

  update public.orders
    set subtotal_satang=v_total,total_satang=v_total,status='awaiting_payment'
    where id=v_order_id;

  insert into public.admin_audit_logs(action,entity,entity_id,after_state,reason)
  values(
    'order_created','order',v_order_id::text,
    jsonb_build_object('user_id',p_user_id,'total_satang',v_total,'checkout_key',p_checkout_key),
    'server-side pricing'
  );

  return query select v_order_id,v_total;
end;
$$;

revoke all on function public.create_order_secure(uuid,uuid[],uuid) from public,anon,authenticated;
grant execute on function public.create_order_secure(uuid,uuid[],uuid) to service_role;

comment on function public.create_order_secure(uuid,uuid[],uuid) is
  'สร้างคำสั่งซื้อจากราคาฐานข้อมูล โดย qualify order_items.order_id เพื่อไม่ให้ชนกับ output parameter';

commit;
