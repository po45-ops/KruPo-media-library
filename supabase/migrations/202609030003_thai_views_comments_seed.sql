begin;

comment on table public.profiles is 'โปรไฟล์ผู้ใช้งาน ผูกกับ auth.users ด้วยรหัสผู้ใช้ถาวร';
comment on table public.roles is 'บทบาทของระบบและคำอธิบายภาษาไทย';
comment on table public.user_roles is 'บทบาทที่กำหนดให้ผู้ใช้ ตรวจสิทธิ์จากฝั่งเซิร์ฟเวอร์';
comment on table public.subjects is 'รายวิชาที่ผู้ดูแลจัดการได้';
comment on table public.grade_levels is 'ระดับชั้นที่ผู้ดูแลจัดการได้';
comment on table public.media_types is 'ประเภทสื่อที่ผู้ดูแลจัดการได้';
comment on table public.media_items is 'ข้อมูลหลักของสื่อการเรียนรู้ ไม่เก็บ URL เกมจริง';
comment on column public.media_items.price_satang is 'ราคาเป็นจำนวนเต็มหน่วยสตางค์ ห้ามใช้ float';
comment on column public.media_items.status is 'สถานะ workflow; สื่อที่เคยขายห้าม hard delete';
comment on column public.media_items.creator_id is 'ผู้สร้างเจ้าของสื่อ';
comment on table public.media_secure_targets is 'ปลายทางเกมเข้ารหัส อ่านได้เฉพาะ server';
comment on column public.media_secure_targets.target_ciphertext is 'URL เข้ารหัส AES-GCM ห้ามส่งให้ client ก่อนตรวจสิทธิ์';
comment on table public.media_files is 'metadata ไฟล์ใน StorageProvider ไม่เก็บ public URL เป็นหลัก';
comment on column public.media_files.area is 'temporary_review, permanent หรือ rejected_retention';
comment on column public.media_files.checksum is 'SHA-256 ของไฟล์สำหรับตรวจซ้ำและความถูกต้อง';
comment on table public.media_versions is 'snapshot ประวัติรุ่นของสื่อ';
comment on table public.creator_profiles is 'ข้อมูลผู้สร้างและระดับความน่าเชื่อถือ';
comment on table public.creator_applications is 'ใบสมัครเป็นผู้สร้างสื่อ';
comment on table public.creator_verifications is 'หลักฐานและผลยืนยันตัวตน/ช่องทางผู้สร้าง';
comment on table public.creator_trust_history is 'ประวัติการเปลี่ยนระดับผู้สร้าง';
comment on table public.media_submissions is 'การส่งสื่อเข้าสู่ขั้นตอนตรวจสอบ';
comment on table public.media_review_results is 'ผลตรวจพร้อม provider/model/input hash/reason/evidence ไม่เก็บแค่ risk';
comment on table public.commission_rules is 'กฎส่วนแบ่งตามระดับและช่วงเวลาที่มีผล';
comment on table public.creator_commission_overrides is 'ข้อยกเว้นส่วนแบ่งรายผู้สร้างแบบมีช่วงเวลาและเหตุผล';
comment on table public.orders is 'หัวคำสั่งซื้อที่สร้างราคาฝั่ง server';
comment on table public.order_items is 'snapshot ชื่อ ราคา ผู้สร้าง และ commission ณ เวลาซื้อ';
comment on column public.order_items.unit_price_satang_snapshot is 'ราคาสื่อขณะสั่งซื้อ ไม่เปลี่ยนตามราคาปัจจุบัน';
comment on table public.payments is 'การชำระเงินจาก provider';
comment on table public.payment_webhook_events is 'event idempotency ป้องกัน webhook ซ้ำ';
comment on table public.entitlements is 'สิทธิ์ใช้สื่อผูกกับ user id ไม่ใช่อีเมล';
comment on table public.financial_ledger_entries is 'บัญชีแยกประเภทการเงินแบบ immutable เป็น source of truth';
comment on column public.financial_ledger_entries.amount_satang is 'จำนวนเต็มสตางค์ ค่าลบใช้สำหรับ reversal/refund/payout';
comment on table public.creator_earnings is 'รายละเอียดรายได้จาก order item เพื่อรายงาน';
comment on table public.creator_balances is 'cache ผลรวมจาก ledger เพื่ออ่านเร็ว ไม่ใช่ source of truth';
comment on table public.payouts is 'รอบจ่ายสะสมให้ผู้สร้าง';
comment on table public.payout_items is 'ledger entries ที่รวมใน payout';
comment on table public.refunds is 'คำขอและผลคืนเงินที่ต้องสร้าง reversal ledger';
comment on table public.link_health_checks is 'ผลตรวจลิงก์รายครั้ง 403 ไม่ถือว่า broken อัตโนมัติ';
comment on table public.link_url_history is 'ประวัติ URL เข้ารหัสก่อนและหลังแก้ไข';
comment on table public.platform_incidents is 'เหตุขัดข้องระดับแพลตฟอร์ม/โดเมน';
comment on table public.creator_strikes is 'ประวัติ strike และ action ต่อผู้สร้าง';
comment on table public.copyright_claims is 'คำร้องด้านลิขสิทธิ์และสถานะการพิจารณา';
comment on table public.copyright_evidence is 'หลักฐานจากผู้ร้อง/ผู้สร้าง';
comment on table public.copyright_decisions is 'คำตัดสินของ moderator พร้อม before/after';
comment on table public.admin_audit_logs is 'ประวัติการดำเนินการสำคัญแบบ append-only';
comment on table public.system_settings is 'ค่าธุรกิจที่แก้จาก Admin โดยไม่ deploy';
comment on table public.feature_flags is 'kill switch และ feature flag ที่แก้จาก Admin';
comment on table public.health_check_results is 'ประวัติสุขภาพบริการโดยไม่เก็บ secret';
comment on table public.background_job_runs is 'ผลรันงานเบื้องหลังและสถิติ';
comment on table public.ai_usage_events is 'ค่าใช้จ่าย AI รายเหตุการณ์สำหรับ budget guard';
comment on table public.game_launch_logs is 'ประวัติเปิดเกมโดยไม่จำเป็นต้องเก็บ IP ดิบ';
comment on table public.download_logs is 'ประวัติดาวน์โหลดไฟล์ที่ผ่านการตรวจสิทธิ์';
comment on table public.media_view_logs is 'สถิติเปิดหน้าสื่อแบบ privacy-conscious';
comment on table public.notifications is 'การแจ้งเตือนผู้ใช้ ผู้สร้าง และผู้ดูแล';

create view public."สื่อ" with (security_invoker=true) as
select m.id,m.slug,m.title_th as "ชื่อสื่อ",s.name_th as "วิชา",mt.name_th as "ประเภท",m.access_type as "การเข้าถึง",m.price_satang as "ราคา_สตางค์",m.status as "สถานะ",m.creator_id as "รหัสผู้สร้าง",m.updated_at as "แก้ไขล่าสุด"
from public.media_items m left join public.subjects s on s.id=m.subject_id left join public.media_types mt on mt.id=m.media_type_id;
create view public."ผู้ใช้งาน" with (security_invoker=true) as select id as "รหัสผู้ใช้",display_name as "ชื่อที่แสดง",status as "สถานะ",created_at as "วันที่สมัคร" from public.profiles;
create view public."ผู้สร้าง" with (security_invoker=true) as select user_id as "รหัสผู้สร้าง",display_name as "ชื่อผู้สร้าง",creator_type as "ประเภท",trust_level as "ระดับ",status as "สถานะ",created_at as "วันที่สร้าง" from public.creator_profiles;
create view public."คำสั่งซื้อ" with (security_invoker=true) as select id as "รหัสคำสั่งซื้อ",user_id as "รหัสผู้ซื้อ",total_satang as "ยอดรวม_สตางค์",status as "สถานะ",created_at as "วันที่สร้าง",paid_at as "วันที่ชำระ" from public.orders;
create view public."รายการชำระเงิน" with (security_invoker=true) as select id as "รหัสรายการ",order_id as "คำสั่งซื้อ",provider as "ผู้ให้บริการ",amount_satang as "ยอด_สตางค์",status as "สถานะ",created_at as "วันที่สร้าง" from public.payments;
create view public."สิทธิ์การใช้งาน" with (security_invoker=true) as select id as "รหัสสิทธิ์",user_id as "ผู้ใช้",media_id as "สื่อ",source as "ที่มา",granted_at as "วันที่ได้รับ",revoked_at as "วันที่ยกเลิก" from public.entitlements;
create view public."รายได้ผู้สร้าง" with (security_invoker=true) as
select creator_id as "รหัสผู้สร้าง",
coalesce(sum(amount_satang) filter(where kind in ('sale_creator','refund_creator','adjustment') and available_at>now()),0)::bigint as "ยอดพัก_สตางค์",
coalesce(sum(amount_satang) filter(where kind in ('sale_creator','refund_creator','adjustment') and available_at<=now()),0)::bigint as "ยอดพร้อมจ่าย_สตางค์",
coalesce(-sum(amount_satang) filter(where kind='payout'),0)::bigint as "จ่ายแล้ว_สตางค์"
from public.financial_ledger_entries where creator_id is not null group by creator_id;
create view public."สถานะลิงก์" with (security_invoker=true) as
select distinct on (l.target_id) l.media_id as "รหัสสื่อ",m.title_th as "ชื่อสื่อ",t.source_platform as "แพลตฟอร์ม",l.status as "สถานะ",l.http_status as "HTTP",l.consecutive_failures as "ล้มเหลวต่อเนื่อง",l.checked_at as "ตรวจล่าสุด",l.next_check_at as "ตรวจครั้งถัดไป"
from public.link_health_checks l join public.media_items m on m.id=l.media_id join public.media_secure_targets t on t.id=l.target_id order by l.target_id,l.checked_at desc;
create view public."คำร้องลิขสิทธิ์" with (security_invoker=true) as select id as "รหัสคำร้อง",claimant_name as "ผู้ร้อง",media_id as "รหัสสื่อ",status as "สถานะ",assigned_to as "ผู้รับผิดชอบ",created_at as "วันที่แจ้ง",updated_at as "แก้ไขล่าสุด" from public.copyright_claims;

do $$ declare v text;begin foreach v in array array['สื่อ','ผู้ใช้งาน','ผู้สร้าง','คำสั่งซื้อ','รายการชำระเงิน','สิทธิ์การใช้งาน','รายได้ผู้สร้าง','สถานะลิงก์','คำร้องลิขสิทธิ์'] loop execute format('revoke all on public.%I from anon,authenticated',v);execute format('grant select on public.%I to service_role',v);end loop;end $$;

insert into public.media_items(slug,title_th,short_description_th,description_th,subject_id,media_type_id,access_type,delivery_type,price_satang,status,tags)
values
('demo-quick-math-p4','คณิตคิดไว ป.4','ข้อมูลตัวอย่างสำหรับทดสอบ','เกมฝึกคิดเลขเร็ว ข้อมูลตัวอย่างห้ามเผยแพร่ production',(select id from public.subjects where slug='math'),(select id from public.media_types where slug='game'),'paid','external_link',500,'draft',array['ตัวอย่าง','ป.4']),
('demo-word-mission','ภารกิจคำศัพท์','ข้อมูลตัวอย่างสำหรับทดสอบ','เกมคำศัพท์ ข้อมูลตัวอย่างห้ามเผยแพร่ production',(select id from public.subjects where slug='english'),(select id from public.media_types where slug='game'),'free','external_link',0,'draft',array['ตัวอย่าง','คำศัพท์']),
('demo-solar-system','ระบบสุริยะ','ข้อมูลตัวอย่างสำหรับทดสอบ','สื่อวิทยาศาสตร์ ข้อมูลตัวอย่างห้ามเผยแพร่ production',(select id from public.subjects where slug='science'),(select id from public.media_types where slug='worksheet'),'free','file',0,'draft',array['ตัวอย่าง','อวกาศ']),
('demo-four-operations','เกมบวก ลบ คูณ หาร','ข้อมูลตัวอย่างสำหรับทดสอบ','เกมคณิตศาสตร์ ข้อมูลตัวอย่างห้ามเผยแพร่ production',(select id from public.subjects where slug='math'),(select id from public.media_types where slug='game'),'paid','both',500,'draft',array['ตัวอย่าง','คณิตศาสตร์']),
('demo-math-worksheet','ใบงานคณิตศาสตร์','ข้อมูลตัวอย่างสำหรับทดสอบ','ใบงานพร้อมเฉลย ข้อมูลตัวอย่างห้ามเผยแพร่ production',(select id from public.subjects where slug='math'),(select id from public.media_types where slug='worksheet'),'paid','file',1000,'draft',array['ตัวอย่าง','ใบงาน']),
('demo-english-game','เกมภาษาอังกฤษ','ข้อมูลตัวอย่างสำหรับทดสอบ','เกมภาษาอังกฤษ ข้อมูลตัวอย่างห้ามเผยแพร่ production',(select id from public.subjects where slug='english'),(select id from public.media_types where slug='game'),'free','external_link',0,'draft',array['ตัวอย่าง','ภาษาอังกฤษ'])
on conflict(slug) do nothing;

commit;
