# Runbook เชื่อม Supabase Staging — KruPo คลังสื่อ

เอกสารนี้ใช้กับ Staging เท่านั้น ไม่อนุญาตให้สร้างหรือแก้ Production และห้ามนำค่าลับมาใส่ใน Git, source code, issue หรือแชต

## สถานะ Hosted Staging ปัจจุบัน

- Repository มี migration `001`–`008`; ไฟล์ `001`–`007` ถูก apply และ freeze แล้ว ส่วน `008` ใช้แก้ Security Advisor เท่านั้น
- Schema มี 54 ตาราง เปิด RLS ทั้ง 54 ตาราง
- หลัง migration 008 มี active policies 30 รายการ, indexes 94 รายการ และ `creator_directory` ใช้ security invoker โดยเปิดผ่าน server repository เท่านั้น
- ตารางทั้ง 54 มีคำอธิบายภาษาไทย และมี view 10 รายการ
- Health Center จะรายงาน Database/Auth เป็น `healthy` เฉพาะเมื่อยิง Supabase สำเร็จจริง ไม่อนุมานจากการมี environment variable
- Supabase CLI 2.116.0 ถูกติดตั้งแบบ project-pinned, authenticated และ link กับ Project Staging แล้ว
- Cloudflare Staging เก็บ Supabase environment ทั้ง 4 ค่าใน secret manager; ไม่มีค่าจริงอยู่ใน repository
- Hosted Playwright ผ่าน session/login/logout, email confirmation callback, My Library, Creator/Admin/Owner authorization และ mobile; User A/B isolation ผ่านกับฐานจริง

## ส่วนที่เจ้าของต้องทำใน Supabase Dashboard

1. เข้า Supabase Dashboard ด้วยบัญชีขององค์กร แล้วสร้าง Project ใหม่ชื่อ **Staging** บนแผนฟรี แยกจาก Production โดยเด็ดขาด
2. เลือก region ที่ใกล้ผู้ใช้ไทยที่สุดจากตัวเลือกที่ Dashboard มี ณ วันที่สร้าง และเก็บรหัสผ่านฐานข้อมูลใน password manager ของเจ้าของ
3. เปิดหน้า Project **Connect** หรือ **Settings → API Keys** แล้วนำ Project URL, Publishable key และ Secret key ไปเก็บใน secret manager เท่านั้น
4. เปิด **Authentication → URL Configuration**
   - Site URL: `https://krupo-media-marketplace.krupo-media-marketplace.workers.dev`
   - Redirect URLs: `https://krupo-media-marketplace.krupo-media-marketplace.workers.dev/auth/callback` และ `https://krupo-media-marketplace.krupo-media-marketplace.workers.dev/auth/email-callback`
   - สำหรับทดสอบในเครื่อง ให้เพิ่ม `/auth/callback` และ `/auth/email-callback` บน `http://localhost:3000` แยกเป็น exact URL
   - ไม่ใช้ wildcard กว้างสำหรับ Hosted Staging
5. เปิด **Authentication → Providers → Email** ให้สมัครด้วยอีเมล/รหัสผ่านได้ และเปิด Confirm Email
6. Google provider ยังไม่ต้องเปิดในรอบนี้
7. สร้างอีเมลทดสอบแยกอย่างน้อย User A, User B, Creator, Admin และ Owner; ห้ามใช้ข้อมูลลูกค้าจริง

Supabase แนะนำ Publishable key สำหรับการเรียกผ่าน RLS และ Secret key สำหรับ backend ที่ควบคุมได้เท่านั้น Secret key bypass RLS จึงต้องอยู่ฝั่ง Worker เท่านั้น แม้ชื่อตัวแปรใน KruPo ยังลงท้ายด้วย `ANON_KEY`/`SERVICE_ROLE_KEY` เพื่อรองรับของเดิม ค่าใหม่แบบ Publishable/Secret ใช้ได้และควรเลือกก่อน legacy key

## ชื่อ Environment Variable

ให้เจ้าของใส่ค่าจริงผ่าน Cloudflare Worker → Settings → Variables and Secrets โดยเลือกชนิด Secret ทุกค่าในรายการนี้:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOOTSTRAP_ADMIN_EMAIL`

`SUPABASE_PROJECT_REF` และรหัสผ่านฐานข้อมูลใช้เฉพาะตอน link/push migration ในเครื่องหรือ CI ที่ปลอดภัย ไม่ต้องส่งเข้า Worker

KruPo อ่านตัวแปร Supabase ผ่าน runtime accessor ฝั่งเซิร์ฟเวอร์ เพื่อไม่ให้ Next.js ตรึงค่าตอน build และไม่มี Supabase secret ถูก import เข้า Client Component

## Apply migrations

ทำจาก repository นี้เท่านั้น และตรวจว่า CLI เลือก Project ชื่อ Staging ก่อนทุกครั้ง:

```bash
supabase login
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push --dry-run
supabase db push
supabase migration list
```

ห้ามใช้ `--include-seed` โดยอัตโนมัติในรอบนี้ ข้อมูล lookup/commission/system settings และสื่อ `draft` ที่ปลอดภัยอยู่ใน migrations แล้ว ไม่มี demo media ใดถูก publish

## ตรวจ schema และ RLS หลัง migration

โหลด credential จาก secret manager เข้าสู่ shell โดยไม่พิมพ์ค่าลง command history แล้วรัน:

```bash
APP_ENV=staging pnpm supabase:verify:staging
```

รอบแรกจะตรวจ 54 tables, 54 RLS tables, 30 policies, comments, views, indexes และ Auth admin endpoint หากต้องการทดสอบ User A/B เพิ่ม ให้กำหนดชื่อต่อไปนี้เฉพาะใน shell/CI secret store:

- `SUPABASE_RLS_USER_A_EMAIL`
- `SUPABASE_RLS_USER_A_PASSWORD`
- `SUPABASE_RLS_USER_B_EMAIL`
- `SUPABASE_RLS_USER_B_PASSWORD`

ตัวตรวจจะยืนยันว่า User A อ่าน profile, role, order และ entitlement ของ User B ไม่ได้ โดยไม่สร้าง order ปลอมและไม่ลบประวัติทางการเงิน

Hosted E2E ใช้ชื่อ secret สำหรับบัญชีทดสอบดังนี้: `SUPABASE_E2E_USER_EMAIL`, `SUPABASE_E2E_USER_PASSWORD`, `SUPABASE_E2E_CREATOR_EMAIL`, `SUPABASE_E2E_CREATOR_PASSWORD`, `SUPABASE_E2E_ADMIN_EMAIL`, `SUPABASE_E2E_ADMIN_PASSWORD`, `SUPABASE_E2E_OWNER_EMAIL`, `SUPABASE_E2E_OWNER_PASSWORD` ค่าเหล่านี้ใส่เฉพาะ CI/local secret environment และไม่ส่งเข้า Worker

## Email confirmation สำหรับ SSR

Hosted Supabase ต้องตั้ง **Auth > Email Templates > Confirm signup** ให้ลิงก์ส่ง `TokenHash` เข้า endpoint ฝั่งเซิร์ฟเวอร์ เพื่อให้ session ถูกเก็บเป็น cookie และไม่ค้างใน URL fragment:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">ยืนยันอีเมลและเปิดใช้งานบัญชี</a>
```

KruPo รองรับ endpoint `/auth/confirm` แล้ว และเตรียม TokenHash template ทั้ง signup confirmation กับ password recovery ไว้ใน `supabase/templates/` สำหรับนำไปตั้งใน Hosted Email Templates ระบบยังรองรับลิงก์มาตรฐานผ่าน `/auth/email-callback` เพิ่มเติม: browser รับ fragment, ลบ token ออกจาก URL ทันที, สร้าง cookie session ด้วย Supabase SSR และให้ `/api/auth/finalize` ตรวจ user ฝั่ง server ก่อนเปิดหน้าถัดไป การส่งอีเมลจริงต้องใช้ Custom SMTP ของ Staging; default mailer มีข้อจำกัดผู้รับ อัตราส่งต่ำ และไม่มี SLA จึงไม่ถือว่าผ่าน Hosted email QA

รายละเอียด provider, recovery flow และ security checklist อยู่ที่ `docs/SMTP_STAGING_TH.md`

## Security Advisor hardening

Migration `008` ทำให้ `creator_directory` เป็น security invoker และเปิดผ่าน repository ฝั่งเซิร์ฟเวอร์เท่านั้น, ถอน EXECUTE ของ trigger/SECURITY DEFINER helper จาก `anon`/`authenticated`, กำหนด fixed `search_path`, ลดการประเมิน `auth.uid()` ซ้ำใน RLS, รวม policy ที่ซ้ำสำหรับ `media_items` และย้าย `pg_trgm`/`citext` ไป schema `extensions` โดยไม่แตะ migrations `001–007`

ตาราง 27 รายการที่ Security Advisor แสดงระดับ INFO ว่า RLS ไม่มี policy เป็น intentional deny-all: ไม่มี grant สำหรับ `anon`/`authenticated` และใช้ได้เฉพาะ server/service-role flow ตัวตรวจ Staging จะทดสอบทั้ง client deny และ server access จริง ห้ามเพิ่ม permissive policy เพื่อซ่อน INFO เหล่านี้

Leaked-password protection ต้องใช้ Supabase Pro ขึ้นไป จึงยังไม่เปิดใน Staging ที่ห้ามสร้างค่าใช้จ่าย ระบบยังบังคับรหัสผ่านขั้นต่ำ, email confirmation, rate limit และรองรับ MFA ตาม config เดิม

## ตรวจ Auth และสิทธิ์ใน Hosted Staging

1. สมัคร User A ผ่าน `/register` และกดยืนยันอีเมล
2. Login แล้วตรวจ session refresh และ `/my-library`
3. Logout แล้วตรวจว่า `/my-library` กลับไป `/login`
4. User ปกติเข้า `/admin` ไม่ได้
5. User ปกติเข้า `/creator/media/new` ไม่ได้จนใบสมัคร Creator ได้รับอนุมัติ
6. ตั้ง `BOOTSTRAP_ADMIN_EMAIL` ก่อน Owner login ครั้งแรก แล้วตรวจ `user_roles` และ `admin_audit_logs`
7. Owner อนุมัติ Creator จาก server workflow แล้วจึงตรวจ Creator route
8. ตรวจว่า HTML/JavaScript bundle ไม่มีค่า `SUPABASE_SERVICE_ROLE_KEY`

## เกณฑ์ผ่านและจุดหยุด

- `/api/health` ต้องมี service status `operational`, Database `healthy`, Auth `healthy`, Payment provider `disabled`, Storage provider `local_test`
- Hosted E2E ต้องผ่าน Home, Catalog, Login, Logout, My Library, Creator, Admin, unauthorized access และ mobile
- เมื่อผ่านให้ STOP ก่อน Google Drive, Stripe และ Production ตามคำสั่งเจ้าของ

อ้างอิง: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations), [Email/password Auth](https://supabase.com/docs/guides/auth/passwords)
