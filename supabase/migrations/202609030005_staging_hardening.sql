begin;

-- Explicit grants keep the API secure if Supabase changes default privileges.
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.subjects,public.grade_levels,public.media_types,public.creator_profiles,public.media_items,public.media_grade_levels,public.media_previews,public.creator_reviews,public.media_reviews to anon, authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.roles,public.user_roles to authenticated;
grant select,insert on public.creator_applications to authenticated;
grant select,insert,update,delete on public.favorites,public.carts,public.cart_items to authenticated;
grant select on public.orders,public.order_items,public.payments,public.entitlements,public.creator_earnings,public.creator_balances,public.financial_ledger_entries,public.payouts,public.media_submissions,public.media_review_results,public.notifications to authenticated;

-- Sensitive file metadata and encrypted targets remain server-only even if a
-- future project starts with permissive default grants.
revoke all on public.media_secure_targets,public.media_files from anon,authenticated;

-- These indexes match the ilike predicates used by the public catalog DAL.
create index if not exists media_items_title_th_trgm on public.media_items using gin (title_th gin_trgm_ops);
create index if not exists media_items_short_description_th_trgm on public.media_items using gin (short_description_th gin_trgm_ops);
create index if not exists payments_order_status on public.payments(order_id,status);
create index if not exists webhook_events_processing on public.payment_webhook_events(processing_status,received_at);
create index if not exists notifications_user_unread on public.notifications(user_id,created_at desc) where read_at is null;

-- Correct the cache so completed payout entries reduce available balance.
create or replace function public.refresh_creator_balance_cache(p_creator_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.role()<>'service_role' then raise exception 'server only'; end if;
 insert into public.creator_balances(creator_id,pending_satang,on_hold_satang,available_satang,paid_satang,calculated_at,source_last_entry_id)
 select p_creator_id,
  coalesce(sum(amount_satang) filter(where status='pending'),0)::integer,
  coalesce(sum(amount_satang) filter(where status='on_hold' and available_at>now()),0)::integer,
  coalesce(sum(amount_satang) filter(where available_at<=now()),0)::integer,
  coalesce(-sum(amount_satang) filter(where kind='payout'),0)::integer,
  now(),(array_agg(id order by created_at desc))[1]
 from public.financial_ledger_entries where creator_id=p_creator_id
 on conflict(creator_id) do update set pending_satang=excluded.pending_satang,on_hold_satang=excluded.on_hold_satang,available_satang=excluded.available_satang,paid_satang=excluded.paid_satang,calculated_at=excluded.calculated_at,source_last_entry_id=excluded.source_last_entry_id;
end $$;
revoke all on function public.refresh_creator_balance_cache(uuid) from public,anon,authenticated;
grant execute on function public.refresh_creator_balance_cache(uuid) to service_role;

comment on function public.refresh_creator_balance_cache(uuid) is 'คำนวณยอด cache ใหม่จาก ledger รวม payout และ reversal; ledger ยังคงเป็น source of truth';

commit;
