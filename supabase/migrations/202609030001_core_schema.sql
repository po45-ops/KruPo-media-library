begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists citext;

create type public.app_role as enum ('owner','admin','reviewer','moderator','finance','support','creator','user');
create type public.media_status as enum ('draft','reviewing','published','degraded','suspended','archived');
create type public.order_status as enum ('pending','awaiting_payment','paid','failed','expired','refunded');
create type public.risk_level as enum ('LOW','MEDIUM','HIGH','UNKNOWN');
create type public.link_status as enum ('ok','warning','broken','unknown');
create type public.ledger_status as enum ('pending','on_hold','available','paid','reversed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', avatar_url text, phone text,
  locale text not null default 'th-TH', timezone text not null default 'Asia/Bangkok',
  status text not null default 'active' check (status in ('active','suspended','disabled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.roles (role public.app_role primary key, name_th text not null, description_th text not null);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null, granted_by uuid references public.profiles(id), granted_at timestamptz not null default now(), revoked_at timestamptz,
  primary key(user_id,role)
);

create table public.subjects (id uuid primary key default gen_random_uuid(),slug text not null unique,name_th text not null unique,icon text,sort_order integer not null default 0,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.grade_levels (id uuid primary key default gen_random_uuid(),slug text not null unique,name_th text not null unique,sort_order integer not null default 0,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.media_types (id uuid primary key default gen_random_uuid(),slug text not null unique,name_th text not null unique,icon text,sort_order integer not null default 0,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  display_name text not null,legal_name text,creator_type text not null default 'other' check(creator_type in ('teacher','student','game_creator','designer','other')),
  bio text,contact_channels jsonb not null default '{}',trust_level text not null default 'new' check(trust_level in ('new','verified','trusted')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','suspended','verified','trusted')),
  seller_agreement_version text,seller_agreement_accepted_at timestamptz,approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.creator_applications (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete restrict,display_name text not null,legal_name text not null,phone text not null,
  creator_type text not null,bio text not null,portfolio_url text,contact_channels jsonb not null default '{}',ownership_confirmed_at timestamptz not null,seller_agreement_version text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,rejection_reason text,created_at timestamptz not null default now()
);
create table public.creator_verifications (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),method text not null,status text not null check(status in ('pending','verified','failed','expired')),evidence jsonb not null default '{}',verified_by uuid references public.profiles(id),verified_at timestamptz,expires_at timestamptz,created_at timestamptz not null default now());
create table public.creator_trust_history (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),from_level text,to_level text not null,reason text not null,actor_id uuid references public.profiles(id),created_at timestamptz not null default now());

create table public.media_items (
  id uuid primary key default gen_random_uuid(),slug text not null unique,title_th text not null,short_description_th text not null,description_th text not null,
  subject_id uuid references public.subjects(id),media_type_id uuid references public.media_types(id),creator_id uuid references public.creator_profiles(user_id) on delete restrict,
  access_type text not null check(access_type in ('free','paid')),delivery_type text not null check(delivery_type in ('external_link','file','both')),
  price_satang integer not null default 0 check(price_satang>=0 and ((access_type='free' and price_satang=0) or access_type='paid')),
  status public.media_status not null default 'draft',featured boolean not null default false,cover_storage_key text,tags text[] not null default '{}',
  protection_status text not null default 'external_only' check(protection_status in ('krupo_protected','verified_external','external_only')),
  rating_average numeric(3,2) not null default 0,rating_count integer not null default 0,sales_count integer not null default 0,
  hidden_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),published_at timestamptz
);
create table public.media_grade_levels (media_id uuid not null references public.media_items(id) on delete cascade,grade_level_id uuid not null references public.grade_levels(id),primary key(media_id,grade_level_id));
create table public.media_previews (id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media_items(id) on delete cascade,storage_provider text,storage_file_id text,storage_path text,alt_th text not null,sort_order integer not null default 0,created_at timestamptz not null default now());
create table public.media_secure_targets (
  id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media_items(id) on delete cascade,target_ciphertext text not null,target_iv text not null,encryption_version text not null default 'AES-256-GCM',
  source_platform text not null default 'Other',verification_token text,verification_method text not null default 'manual',verified_at timestamptz,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index media_secure_targets_one_active on public.media_secure_targets(media_id) where active;
create table public.media_files (
  id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media_items(id) on delete restrict,purpose text not null check(purpose in ('source','download','backup','cover','preview','evidence')),
  storage_provider text not null,storage_file_id text not null,storage_path text not null,file_name text not null,mime_type text not null,file_size bigint not null check(file_size>=0),checksum text not null,
  area text not null check(area in ('temporary_review','permanent','rejected_retention')),malware_status text not null default 'pending' check(malware_status in ('pending','clean','unsafe','manual_review','failed')),
  active boolean not null default true,retention_until timestamptz,created_at timestamptz not null default now(),unique(storage_provider,storage_file_id)
);
create table public.media_versions (id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media_items(id) on delete restrict,version_number integer not null,change_summary text not null,snapshot jsonb not null,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),unique(media_id,version_number));

create table public.favorites (user_id uuid not null references public.profiles(id) on delete cascade,media_id uuid not null references public.media_items(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,media_id));
create table public.carts (id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.cart_items (cart_id uuid not null references public.carts(id) on delete cascade,media_id uuid not null references public.media_items(id) on delete cascade,created_at timestamptz not null default now(),primary key(cart_id,media_id));

create table public.commission_rules (id uuid primary key default gen_random_uuid(),level text not null check(level in ('new','verified','trusted')),platform_percent numeric(5,2) not null,creator_percent numeric(5,2) not null,effective_from timestamptz not null,effective_to timestamptz,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),check(platform_percent>=0 and creator_percent>=0 and platform_percent+creator_percent=100));
create table public.creator_commission_overrides (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),platform_percent numeric(5,2) not null,creator_percent numeric(5,2) not null,effective_from timestamptz not null,effective_to timestamptz,reason text not null,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),check(platform_percent+creator_percent=100));

create table public.orders (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete restrict,status public.order_status not null default 'pending',currency text not null default 'thb' check(currency='thb'),subtotal_satang integer not null check(subtotal_satang>=0),total_satang integer not null check(total_satang>=0),payment_provider text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),paid_at timestamptz,refunded_at timestamptz);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete restrict,media_id uuid not null references public.media_items(id) on delete restrict,
  media_title_snapshot text not null,unit_price_satang_snapshot integer not null check(unit_price_satang_snapshot>=0),creator_id_snapshot uuid references public.creator_profiles(user_id),
  platform_commission_percent_snapshot numeric(5,2) not null,creator_commission_percent_snapshot numeric(5,2) not null,creator_share_satang_snapshot integer not null,platform_share_satang_snapshot integer not null,
  created_at timestamptz not null default now(),unique(order_id,media_id),check(creator_share_satang_snapshot+platform_share_satang_snapshot=unit_price_satang_snapshot)
);
create table public.payments (id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete restrict,provider text not null,provider_payment_id text not null,status public.order_status not null,amount_satang integer not null check(amount_satang>=0),currency text not null default 'thb',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,provider_payment_id));
create table public.payment_webhook_events (id uuid primary key default gen_random_uuid(),provider text not null,event_id text not null,event_type text not null,payload_hash text not null,order_id uuid references public.orders(id),processing_status text not null default 'received',received_at timestamptz not null default now(),processed_at timestamptz,error_code text,unique(provider,event_id));
create table public.entitlements (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete restrict,media_id uuid not null references public.media_items(id) on delete restrict,source text not null check(source in ('purchase','free_claim','admin_grant')),order_id uuid references public.orders(id) on delete restrict,granted_by uuid references public.profiles(id),granted_at timestamptz not null default now(),revoked_at timestamptz,revoke_reason text);
create unique index entitlements_active_unique on public.entitlements(user_id,media_id) where revoked_at is null;

create table public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),creator_id uuid references public.creator_profiles(user_id),kind text not null check(kind in ('sale_creator','sale_platform','payment_fee','refund_creator','refund_platform','payout','adjustment')),
  status public.ledger_status not null,amount_satang integer not null check(amount_satang<>0),reference_type text not null,reference_id uuid not null,reverses_entry_id uuid references public.financial_ledger_entries(id),available_at timestamptz,
  metadata jsonb not null default '{}',created_by uuid references public.profiles(id),created_at timestamptz not null default now()
);
create unique index ledger_no_duplicate_sale on public.financial_ledger_entries(kind,reference_type,reference_id,coalesce(creator_id,'00000000-0000-0000-0000-000000000000'::uuid)) where kind in ('sale_creator','sale_platform');
create table public.creator_earnings (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),order_item_id uuid not null unique references public.order_items(id) on delete restrict,gross_satang integer not null,creator_share_satang integer not null,platform_share_satang integer not null,available_at timestamptz not null,status public.ledger_status not null default 'on_hold',created_at timestamptz not null default now());
create table public.creator_balances (creator_id uuid primary key references public.creator_profiles(user_id),pending_satang integer not null default 0,on_hold_satang integer not null default 0,available_satang integer not null default 0,paid_satang integer not null default 0,calculated_at timestamptz not null default now(),source_last_entry_id uuid);
create table public.payouts (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),amount_satang integer not null check(amount_satang>0),status text not null check(status in ('draft','approved','processing','paid','failed','cancelled')),method text not null default 'manual',external_reference text,approved_by uuid references public.profiles(id),paid_by uuid references public.profiles(id),created_at timestamptz not null default now(),paid_at timestamptz);
create table public.payout_items (payout_id uuid not null references public.payouts(id) on delete restrict,ledger_entry_id uuid not null unique references public.financial_ledger_entries(id) on delete restrict,amount_satang integer not null check(amount_satang>0),primary key(payout_id,ledger_entry_id));
create table public.refunds (id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete restrict,payment_id uuid references public.payments(id) on delete restrict,amount_satang integer not null check(amount_satang>0),reason text not null,status text not null check(status in ('requested','approved','processing','refunded','failed')),provider_refund_id text,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),completed_at timestamptz);

create table public.media_submissions (id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media_items(id) on delete restrict,creator_id uuid not null references public.creator_profiles(user_id),status text not null check(status in ('submitted','validating','safety_check','copyright_check','human_review','approved','rejected','withdrawn')),ownership_evidence text not null,submitted_at timestamptz not null default now(),reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,decision_reason text);
create table public.media_review_results (id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.media_submissions(id) on delete restrict,check_type text not null,provider text not null,model text,model_version text,input_hash text not null,risk public.risk_level not null,similarity numeric(5,4),urls_found jsonb not null default '[]',result jsonb not null,reason text not null,evidence jsonb not null default '[]',checked_at timestamptz not null default now(),admin_decision text,decided_by uuid references public.profiles(id),decided_at timestamptz);
create table public.creator_reviews (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),user_id uuid not null references public.profiles(id),rating smallint not null check(rating between 1 and 5),comment text,status text not null default 'published',created_at timestamptz not null default now(),unique(creator_id,user_id));
create table public.media_reviews (id uuid primary key default gen_random_uuid(),media_id uuid not null references public.media_items(id),user_id uuid not null references public.profiles(id),rating smallint not null check(rating between 1 and 5),comment text,status text not null default 'published',created_at timestamptz not null default now(),unique(media_id,user_id));
create table public.creator_strikes (id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creator_profiles(user_id),strike_type text not null check(strike_type in ('copyright','fake_media','repeated_broken_links','fraud','abuse')),severity smallint not null default 1 check(severity between 1 and 3),action text not null check(action in ('enhanced_review','temporary_suspend','permanent_suspend','warning')),reason text not null,source_entity text,source_entity_id uuid,issued_by uuid references public.profiles(id),expires_at timestamptz,created_at timestamptz not null default now());

create table public.copyright_claims (id uuid primary key default gen_random_uuid(),claimant_name text not null,claimant_contact text not null,original_work text not null,original_url text,reported_media_reference text not null,media_id uuid references public.media_items(id),details text not null,status text not null check(status in ('under_review','media_hold','awaiting_creator','decision','restored','removed','closed')),assigned_to uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.copyright_evidence (id uuid primary key default gen_random_uuid(),claim_id uuid not null references public.copyright_claims(id) on delete restrict,submitted_by uuid references public.profiles(id),source text not null,storage_provider text,storage_file_id text,storage_path text,description text,checksum text,created_at timestamptz not null default now());
create table public.copyright_decisions (id uuid primary key default gen_random_uuid(),claim_id uuid not null references public.copyright_claims(id) on delete restrict,decision text not null check(decision in ('restore','remove','request_more_information','suspend_creator')),reason text not null,decided_by uuid not null references public.profiles(id),before_state jsonb not null,after_state jsonb not null,created_at timestamptz not null default now());
create table public.media_reports (id uuid primary key default gen_random_uuid(),media_id uuid references public.media_items(id),reporter_id uuid references public.profiles(id),report_type text not null,details text not null,status text not null default 'open',assigned_to uuid references public.profiles(id),created_at timestamptz not null default now(),resolved_at timestamptz);

create table public.game_launch_logs (id bigint generated always as identity primary key,user_id uuid references public.profiles(id),media_id uuid not null references public.media_items(id),access_type text not null,launched_at timestamptz not null default now(),privacy_ip_hash text,user_agent_family text);
create table public.download_logs (id bigint generated always as identity primary key,user_id uuid not null references public.profiles(id),media_id uuid not null references public.media_items(id),media_file_id text not null,downloaded_at timestamptz not null default now(),privacy_ip_hash text);
create table public.media_view_logs (id bigint generated always as identity primary key,user_id uuid references public.profiles(id),media_id uuid not null references public.media_items(id),viewed_at timestamptz not null default now(),session_hash text);
create table public.link_health_checks (id bigint generated always as identity primary key,media_id uuid not null references public.media_items(id),target_id uuid not null references public.media_secure_targets(id),status public.link_status not null,http_status integer,response_time_ms integer,redirect_domain text,reason text,checked_at timestamptz not null default now(),next_check_at timestamptz,consecutive_failures integer not null default 0);
create table public.link_url_history (id uuid primary key default gen_random_uuid(),target_id uuid not null references public.media_secure_targets(id),old_url_ciphertext text,new_url_ciphertext text not null,changed_by uuid not null references public.profiles(id),reason text not null,changed_at timestamptz not null default now());
create table public.platform_incidents (id uuid primary key default gen_random_uuid(),source_platform text not null,domain text not null,status text not null check(status in ('investigating','paused','monitoring','resolved')),affected_media_count integer not null default 0,sales_paused boolean not null default false,details text,created_at timestamptz not null default now(),resolved_at timestamptz);

create table public.system_settings (key text primary key,value jsonb not null,is_public boolean not null default false,description_th text not null,updated_by uuid references public.profiles(id),updated_at timestamptz not null default now());
create table public.feature_flags (key text primary key,enabled boolean not null default false,scope jsonb not null default '{}',description_th text not null,updated_by uuid references public.profiles(id),updated_at timestamptz not null default now());
create table public.admin_audit_logs (id bigint generated always as identity primary key,actor_id uuid references public.profiles(id),action text not null,entity text not null,entity_id text,before_state jsonb,after_state jsonb,reason text,request_id text,created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),audience_role public.app_role,title_th text not null,body_th text not null,type text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.health_check_results (id bigint generated always as identity primary key,component text not null,status text not null check(status in ('healthy','warning','critical','unknown')),message text not null,metadata jsonb not null default '{}',checked_at timestamptz not null default now());
create table public.background_job_runs (id uuid primary key default gen_random_uuid(),job_name text not null,status text not null check(status in ('running','succeeded','failed','partial')),started_at timestamptz not null default now(),finished_at timestamptz,error_summary text,metrics jsonb not null default '{}');
create table public.ai_usage_events (id bigint generated always as identity primary key,provider text not null,model text,model_version text,input_hash text not null,cost_satang integer not null default 0 check(cost_satang>=0),purpose text not null,created_at timestamptz not null default now());

-- array_to_string is STABLE (not IMMUTABLE), so it cannot be used in an
-- expression index. Keep searchable text and tags in separate valid indexes.
create index media_items_search_trgm on public.media_items using gin ((title_th||' '||short_description_th||' '||description_th) gin_trgm_ops);
create index media_items_tags_gin on public.media_items using gin (tags);
create index media_items_catalog on public.media_items(status,subject_id,media_type_id,access_type,published_at desc);
create index media_items_creator on public.media_items(creator_id,status,updated_at desc);
create index orders_user_created on public.orders(user_id,created_at desc);
create index order_items_creator on public.order_items(creator_id_snapshot,created_at desc);
create index ledger_creator_available on public.financial_ledger_entries(creator_id,status,available_at,created_at);
create index link_checks_latest on public.link_health_checks(target_id,checked_at desc);
create index audit_created on public.admin_audit_logs(created_at desc);
create index claims_status on public.copyright_claims(status,created_at);
create index submissions_status on public.media_submissions(status,submitted_at);
create index launches_media_time on public.game_launch_logs(media_id,launched_at desc);

insert into public.roles(role,name_th,description_th) values
('owner','เจ้าของระบบ','จัดการได้ทุกส่วน'),('admin','ผู้ดูแลระบบ','ตั้งค่าและจัดการระบบทั่วไป'),('reviewer','ผู้ตรวจสื่อ','ตรวจและอนุมัติสื่อ'),('moderator','ผู้ดูแลข้อร้องเรียน','จัดการลิขสิทธิ์ รีวิว และการร้องเรียน'),('finance','การเงิน','คำสั่งซื้อ คืนเงิน และการจ่ายผู้สร้าง'),('support','ช่วยเหลือผู้ใช้','ดูข้อมูลเพื่อช่วยเหลือ แต่แก้เงินไม่ได้'),('creator','ผู้สร้างสื่อ','จัดการสื่อและรายได้ของตน'),('user','สมาชิก','ซื้อและใช้สื่อ');
insert into public.subjects(slug,name_th,sort_order) values ('math','คณิตศาสตร์',1),('science','วิทยาศาสตร์',2),('thai','ภาษาไทย',3),('english','ภาษาอังกฤษ',4),('social','สังคมศึกษา',5),('computer','คอมพิวเตอร์',6),('art','ศิลปะ',7),('health','สุขศึกษา',8);
insert into public.grade_levels(slug,name_th,sort_order) values ('kindergarten','อนุบาล',1),('p1','ประถมศึกษาปีที่ 1',2),('p2','ประถมศึกษาปีที่ 2',3),('p3','ประถมศึกษาปีที่ 3',4),('p4','ประถมศึกษาปีที่ 4',5),('p5','ประถมศึกษาปีที่ 5',6),('p6','ประถมศึกษาปีที่ 6',7),('m1','มัธยมศึกษาปีที่ 1',8),('m2','มัธยมศึกษาปีที่ 2',9),('m3','มัธยมศึกษาปีที่ 3',10),('m4','มัธยมศึกษาปีที่ 4',11),('m5','มัธยมศึกษาปีที่ 5',12),('m6','มัธยมศึกษาปีที่ 6',13),('vocational','อาชีวศึกษา',14),('other','อื่น ๆ',99);
insert into public.media_types(slug,name_th,sort_order) values ('game','เกมการศึกษา',1),('worksheet','ใบงาน',2),('exercise','แบบฝึกหัด',3),('powerpoint','PowerPoint',4),('pdf','PDF',5),('quiz','แบบทดสอบ',6),('video','วิดีโอ',7),('lesson-plan','แผนการสอน',8),('other','อื่น ๆ',99);
insert into public.commission_rules(level,platform_percent,creator_percent,effective_from) values ('new',15,85,'2026-01-01'),('verified',12,88,'2026-01-01'),('trusted',10,90,'2026-01-01');
insert into public.system_settings(key,value,is_public,description_th) values
('app_name','"KruPo คลังสื่อ"',true,'ชื่อระบบ'),('tagline','"สื่อดี ครบ ครูถูกใจ นักเรียนสนุก"',true,'คำโปรย'),('minimum_checkout_satang','1000',false,'ยอดชำระขั้นต่ำหน่วยสตางค์'),('minimum_payout_satang','50000',false,'ยอดขั้นต่ำการจ่ายผู้สร้าง'),('creator_hold_days','14',false,'จำนวนวันพักรายได้ผู้สร้าง'),('ai_monthly_budget_satang','150000',false,'งบ AI ต่อเดือนหน่วยสตางค์'),('link_repair_sla_hours','72',false,'เวลาที่ให้ผู้สร้างแก้ลิงก์');
insert into public.feature_flags(key,enabled,description_th) values ('payment',false,'เปิดรับชำระเงินจริง'),('creator_registration',true,'เปิดรับสมัครผู้สร้าง'),('upload',true,'เปิดอัปโหลด'),('ai_advanced',false,'เปิด Advanced AI'),('google_drive_upload',false,'เปิดอัปโหลดไป Google Drive'),('new_orders',false,'เปิดรับคำสั่งซื้อใหม่'),('payout',false,'เปิดการจ่ายเงิน'),('maintenance_mode',false,'โหมดปิดปรับปรุง');

commit;
