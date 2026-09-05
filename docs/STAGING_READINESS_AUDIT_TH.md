# Audit เทียบ KruPo Master Specification ล่าสุด

วันที่ตรวจ: 3 กันยายน 2569 — ตรวจจาก source code, migrations, automated tests และการรัน local จริง ไม่ใช้การมีหน้า UI เป็นหลักฐานว่า backend ทำงานแล้ว

## สรุป

- ความพร้อมรวมตาม acceptance criteria ทั้งระบบ: **58%**
- Local development/staging mode: ใช้งานเพื่อพัฒนา, Visual QA และ contract QA ได้
- Hosted Staging end-to-end: **ยังไม่พร้อม sign-off** เพราะไม่มี external credentials, migrations ยังไม่ได้ apply กับ PostgreSQL จริง และ critical UI journeys หลายส่วนยังแสดงข้อมูล/โครงหน้าแทนการเชื่อม transaction จริง
- Production: **ไม่พร้อมและถูกหยุดไว้** ทั้งนโยบายและ guard ใน source

## ทำงานจริงแล้วและมีหลักฐานทดสอบ Local

| กลุ่ม | สิ่งที่พิสูจน์แล้ว |
|---|---|
| Foundation | Next.js/React/TypeScript/Tailwind, pnpm lock, error/404, Cloudflare build config |
| Public UI | หน้าแรก, catalog/filter, detail, games, auth screens, creator/admin/legal, responsive mobile nav |
| Domain | integer satang, checkout minimum, commission 85/88/90 จาก rules, order snapshot, ledger/reversal |
| Security | server role matrix, AES-GCM target, file validation, same-origin mutation check, security headers, production guard |
| Provider contract | LocalTestStorage ครบ 7 methods, MockPayment contract, Basic copyright duplicate/similarity, Stripe fake signature rejection |
| Database contract | 5 migration files, 50+ tables, RLS, explicit grants/revokes, Thai views/comments, indexes, idempotent payment RPC, immutable ledger/audit |
| Access | `/go` และ download route ตรวจสถานะ/สิทธิ์ฝั่ง server และไม่ส่ง secure URL ใน catalog DTO |
| QA | lint/typecheck/unit/build, Playwright Desktop/Mobile, dependency audit และ secret pattern scan |

## Implemented แต่ยังไม่ผ่าน External integration

| Feature | หลักฐานใน source | เหตุผลที่ยังไม่เรียกว่าทำงานจริงครบวงจร |
|---|---|---|
| Supabase Auth | SSR client, login/register/forgot, callback, owner bootstrap | ไม่มี Staging project/บัญชี/Google provider ให้ทดสอบ |
| Database/RLS | migrations + static contract tests | ไม่มี PostgreSQL/Supabase runtime ให้ apply และ adversarial test |
| Google Drive | private upload/download/move/copy/delete provider | ไม่มี OAuth credentials/folder และยังไม่ทดสอบ API จริง |
| Stripe PromptPay | PaymentIntent + raw-body signature verification | ไม่มี Stripe test keys/webhook endpoint; checkout UI ยังไม่เชื่อม |
| Creator application | validated API insert | หน้า form มีจริง แต่ยังไม่ submit ถึง Staging DB |
| Media submission | temporary storage, hash, Basic copyright, encrypted URL, submission row | file safety ยังไม่ถูก execute จนได้ `clean`; ไม่มี scanner จริง |
| Admin approval | role gate + approval service + storage move + audit | Admin queue เป็น presentation table และยังไม่มี action controls จริง |
| Orders/payment/entitlement | server RPC และ webhook transaction | Cart/checkout UI ยังไม่เรียก flow และ DB ยังไม่รัน |
| Link health | classifier/job logic/SLA/platform incident logic | ไม่มี scheduler, target จริง หรือ history integration test |
| Copyright claim | public validated insert route | evidence file/counter-evidence/hold/decision UI ยังไม่ครบ |

## Mock / Development-only

- `MockPaymentProvider` และ mock webhook; ใช้ได้เมื่อ `APP_ENV=development|test|staging` และปฏิเสธเมื่อ `APP_ENV=production` (ถ้าไม่ได้ตั้ง `APP_ENV` จะ fail-safe ตาม `NODE_ENV`)
- `LocalTestStorageProvider` แบบ memory; ปฏิเสธใน production env validation
- Dev owner fallback เมื่อไม่มี Supabase; ไม่ทำงานใน production
- Fixture สื่อ 6 รายการใน dev UI พร้อมป้าย “ตัวอย่าง • ยังไม่เผยแพร่จริง”; production export เป็น array ว่าง
- Seed สื่อใน migration เป็น `draft` ทุกชิ้น
- Creator/Admin KPI, My Library, Cart และหลาย list pages เป็นค่าตัวอย่าง/ศูนย์/โครง presentation
- Basic Copyright Checker และ Basic File Safety เป็น heuristic/manual-review ไม่ใช่ malware scanner หรือ paid AI

## ยังขาดก่อน Hosted Staging sign-off

รายการ authoritative อยู่ในหมวด C ของ `STAGING_CHECKLIST_TH.md` โดย critical blockers คือ Cart/Checkout จริง, My Library จาก entitlement, Admin/Creator data/actions จริง, migration execution/RLS adversarial test, file safety decision, distributed rate limiting และ scheduled jobs

## Database/RLS/Index audit

- ทุก table ในรายการ RLS loop ถูก enable RLS
- `orders`, `order_items`, `payments`, `entitlements`, creator earnings/balance/ledger จำกัดตาม owner row
- `media_secure_targets` และ `media_files` ไม่มี client policy และ migration 005 revoke จาก anon/authenticated ชัดเจน
- privileged RPC ตรวจ `auth.role()='service_role'` และ revoke public/anon/authenticated execute
- `financial_ledger_entries` และ `admin_audit_logs` มี trigger ปฏิเสธ UPDATE/DELETE
- payment events unique `(provider,event_id)` และ active entitlement unique `(user_id,media_id)`
- catalog/status/creator/order/ledger/link/audit/claim/submission indexes มีอยู่; migration 005 เพิ่ม trigram ให้ predicate title/short description ที่ใช้งานจริง
- แก้ bug `creator_balances.available_satang` ให้รวม payout/reversal แล้ว
- ข้อจำกัด: เป็น static SQL audit เท่านั้น; ยังต้อง apply บน Supabase Staging จริง

## Production safety audit

- `.env*` ถูก ignore ยกเว้น `.env.example`
- ไม่พบรูปแบบ secret จริงจาก source scan และ repository ยังไม่มี commit history
- production env schema ปฏิเสธ `PAYMENT_PROVIDER=mock` และ `STORAGE_PROVIDER=local_test` เมื่อ `APP_ENV=production`; Hosted Staging แยกด้วย `APP_ENV=staging`
- production deploy script ต้องมี HTTPS, Supabase/server key, encryption key, provider จริง และ explicit confirmation
- `wrangler` ยังไม่ได้ถูกเรียก deploy และไม่มี resource ภายนอกถูกสร้าง
- Production catalog ไม่ใช้ dev fixtures; database seed ทุกแถวเป็น draft

## ข้อจำกัดของผล Playwright รอบนี้

Browser E2E พิสูจน์ navigation/form/locked state/responsive UI ส่วน payment→entitlement→ledger ใช้ Playwright contract tests กับ provider/domain/SQL migration เพราะไม่มี Supabase/Stripe Staging credentials จึง **ห้ามตีความว่า external E2E ผ่านแล้ว** ต้องรันซ้ำกับ Staging จริงตาม checklist

## Bugs ที่พบและแก้ในรอบ QA

- แยก Playwright Desktop/Mobile project หลัง mobile test ถูกนำไปรันบน Desktop
- แก้ strict locator ที่ชนลิงก์ชื่อซ้ำและ form ที่มี desktop/mobile copy
- แก้ mobile Catalog จาก filter ยาวเต็มหน้าเป็น collapsible filter panel
- ซ่อน public header/footer ใน Admin layout เพื่อลด navigation ซ้ำ
- เพิ่ม dev-only CSP allowance ที่ React dev runtime ต้องใช้ โดย production CSP ไม่เพิ่ม allowance นี้
- แก้ optional environment variables ที่เป็นค่าว่างใน `.env.example` ให้ validation ผ่าน
- แก้ `pnpm bootstrap` ให้รองรับ ESM/CommonJS ของ `@next/env` และแยก env schema จาก `server-only`
- แก้ public detail query ที่เดิมค้นจาก 60 รายการแรก เป็น query ตาม slug โดยตรง
- แก้ submission ให้ resolve และบันทึก subject/media type/grade foreign keys
- เพิ่ม same-origin guard และ local rate limit ให้ mutation endpoints; production fail-closed จนมี distributed adapter
- เพิ่ม role gate ราย Admin section ไม่ให้ support/reviewer/finance เปิด section เกินหน้าที่
- เพิ่ม server auth guard ให้ account/orders/favorites/cart/My Library
- แก้ ledger balance cache ให้ payout/reversal ลด available balance
- เพิ่ม explicit database grants/revokes และ indexes ที่ตรงกับ catalog/operation query
- แก้ CI ให้ใช้ pnpm 11.19.0 ตรงกับ `packageManager`
- แยก application environment ออกจาก build mode เพื่อให้ Cloudflare Staging ใช้ adapter จำลองได้ โดย Production ยังถูกบล็อกแบบ fail-closed
- เพิ่ม rate limit ให้การส่งใบสมัคร Creator

## Bugs / Risks ที่ยังเหลือ

- Cart, checkout, My Library, Creator dashboard และ Admin list/action UI ยังไม่เชื่อมข้อมูลจริงครบ
- submission หลาย insert ยังไม่รวมเป็น database RPC transaction เดียว; หากขั้นท้ายล้มเหลวอาจเหลือ reviewing row ที่ไม่ published และต้อง cleanup
- Basic file safety ยังไม่ใช่ malware scanner และยังไม่ได้บันทึกผล `clean` อัตโนมัติ
- distributed rate limiter, scheduler และ DNS rebinding-resistant link fetcher ยังไม่มี provider จริง
- OpenNext แจ้ง Node.js Proxy support บน Cloudflare เป็น experimental
- SQL ยังไม่ได้ execute บน PostgreSQL/Supabase จริง จึงยังไม่มีหลักฐาน syntax/runtime/permission จาก target platform
- Google Drive และ Stripe provider ผ่าน compile/contract tests แต่ยังไม่ผ่าน provider sandbox integration
