# รายงาน STAGING READINESS + END-TO-END QA — KruPo คลังสื่อ

วันที่ตรวจ: 3 กันยายน 2569 (Asia/Bangkok)

## คำตัดสิน

- ความพร้อมรวมเทียบ KruPo Master Specification: **58%**
- Local staging mode: **GO** สำหรับพัฒนา, Visual QA และทดสอบ contract ด้วย adapter จำลอง
- Hosted Staging: **NO-GO สำหรับ sign-off** จนกว่าจะมี Supabase Staging, apply migrations จริง และปิด critical functional gaps
- Production: **STOP / NO-GO** — ไม่มีการ Deploy, ไม่มี resource ที่มีค่าใช้จ่าย และไม่มีการเปิดรับเงินจริง

เปอร์เซ็นต์นี้นับจากความสามารถที่พิสูจน์ได้จาก source, migration, automated test และการรันจริงเท่านั้น หน้า UI ที่ยังไม่เชื่อมข้อมูลจริงไม่นับเป็น feature ที่เสร็จ

## ผล Quality Gates ล่าสุด

| Gate | ผล |
|---|---|
| `pnpm lint` | ผ่าน ไม่มี warning |
| `pnpm typecheck` | ผ่าน |
| `pnpm test` | ผ่าน 8 files / 42 tests |
| `pnpm build` | ผ่าน Next.js 16.3.4 จำนวน 39 static/dynamic route entries |
| Critical Playwright | ผ่าน 18/18 ทั้ง Desktop และ Mobile |
| Cloudflare/OpenNext build | ผ่าน สร้าง worker bundle สำเร็จ |
| `pnpm audit --prod` | ไม่พบ known vulnerability |
| `pnpm bootstrap` | ผ่าน; เตือนอย่างถูกต้องว่ายังไม่มี Database/Auth และยังใช้ local/mock |
| Secret scan | ไม่พบ key/token/private-key pattern จริงใน source |
| Git history | Repository ยังไม่มี commit จึงไม่มี secret ใน commit history |
| Production negative test | ผ่าน: deploy guard ปฏิเสธ mock/local provider, credential ไม่ครบ และไม่มี explicit confirmation |

หมายเหตุ: OpenNext เตือนว่า Node.js Proxy/Middleware บน Cloudflare ยังเป็น experimental จึงต้องพิสูจน์ routing/auth บน Hosted Staging ก่อน sign-off

## สิ่งที่ใช้งานจริงแล้ว

- Next.js/React/strict TypeScript/Tailwind, responsive Thai UI และ Cloudflare-compatible build
- หน้า Public, Catalog, Media detail, Games, Auth, Creator, Admin, Health, Copyright และ Legal
- Catalog repository อ่านเฉพาะ `published`/`degraded` จาก Supabase เมื่อมี config และไม่ส่ง secure target ออก public DTO
- เงินใช้ integer satang, checkout minimum, commission rule/snapshot และ immutable financial ledger/reversal
- Server-side role matrix, route guards, RLS definitions, explicit grants/revokes และ append-only audit/ledger triggers
- `/go/[mediaId]` และ private download ตรวจ login/entitlement/status ฝั่ง server พร้อม `Cache-Control: no-store`
- StorageProvider abstraction ครบ `upload/download/delete/exists/getMetadata/move/copy`
- Google Drive provider มี private upload/download/move/copy/delete implementation ผ่าน REST/OAuth contract
- Stripe PromptPay provider มี PaymentIntent และ raw-body webhook signature verification
- Order RPC โหลดราคา/commission จากฐานข้อมูล, snapshot รายการ และ payment webhook ออก entitlement/ledger แบบ transaction + idempotent event ID
- Basic Copyright Risk Guard ตรวจ SHA-256, URL/title/text duplicate, metadata และ image perceptual hash โดยไม่อ้างว่า AI รับรองลิขสิทธิ์
- Link health classifier/job logic รองรับ 403 เป็น warning, failure threshold, degraded/suspend และ platform incident
- Same-origin protection, Zod validation, security headers, secure cookies ผ่าน Supabase SSR และ rate limit สำหรับ mutation สำคัญ
- `APP_ENV=staging` แยกจาก build mode: Hosted Staging ใช้ mock adapter ได้ แต่ `APP_ENV=production` ปฏิเสธ mock/local แบบ fail-closed
- Demo media ถูกตัดออกจาก production build และ migration seed ทุกชิ้นเป็น `draft`

## สิ่งที่ยังเป็น Mock / Development-only

- MockPaymentProvider และ mock webhook
- LocalTestStorageProvider แบบ in-memory
- Dev owner fallback เมื่อไม่มี Supabase; ไม่ทำงานใน production
- สื่อ fixture 6 รายการเฉพาะ development พร้อมป้ายว่าเป็นตัวอย่าง
- KPI ของ Admin/Creator, Cart และ My Library บางส่วนยังเป็น presentation/fixture
- Basic File Safety เป็น heuristic/manual-review ไม่ใช่ malware scanner จริง
- Advanced copyright AI ไม่มี paid provider และจะ fallback เป็น Basic + Manual Review

## สิ่งที่ยังขาดหรือยังไม่พิสูจน์จริง

- ยังไม่ได้ apply migrations 001–005 บน Supabase/PostgreSQL จริง และยังไม่ได้ทำ RLS adversarial test ด้วย user A/B และทุก role
- Cart UI ยังไม่อ่าน/เพิ่ม/ลบ `carts`/`cart_items` จริง และ checkout UI ยังไม่เรียก payment session ครบวงจร
- My Library ยังไม่อ่าน entitlement จริงใน UI; Creator/Admin dashboard/list/action ยังไม่อ่านและแก้ข้อมูลจริงครบ
- Admin feature-flag API มีแล้ว แต่ kill-switch UI ยังเป็น status presentation
- Import/export CSV, notification delivery, scheduler และ backup/restore drill ยังไม่ครบ execution จริง
- Media submission หลาย insert ยังไม่รวมเป็น RPC transaction เดียว
- Copyright evidence/counter-evidence upload และ moderator decision UI ยังไม่ครบ
- Distributed rate limiter และ DNS-rebinding-safe external URL fetcher ยังไม่มี production adapter
- Google Drive/Stripe ผ่าน compile และ contract tests แต่ยังไม่มี provider sandbox integration
- Browser Playwright ที่ไม่มี external credentials พิสูจน์ UI/lock state; payment→entitlement→ledger ใช้ provider/domain/SQL contract tests จึงยังไม่ใช่ external browser+database E2E

## Critical Playwright coverage

ผ่าน 18 tests ครอบคลุมหน้าแรก, ค้นหา/filter, โครงสร้างสมัคร/เข้าสู่ระบบ/Google, สมัคร Creator, ส่งสื่อ, Admin Review, free CTA, paid locked, cart minimum 10 บาท, mock payment contract, entitlement/idempotency SQL contract, My Library UI, creator revenue/ledger/refund reversal, link health, copyright complaint, admin permissions และ mobile navigation

การทดสอบ register/login/Google OAuth, creator submit, admin action และ payment→entitlement→library กับบริการจริง ต้องรันซ้ำเมื่อมี Staging credentials

## Visual QA เทียบภาพอ้างอิง

- ตรวจหน้า Home, Catalog, Login, Admin และ Health ทั้ง Desktop 1280px และ Mobile 390px
- ไม่มี horizontal overflow ในหน้าหลักที่ตรวจ
- ปรับ Catalog มือถือจาก sidebar ยาวเป็น filter drawer แบบพับได้
- Admin แยก public header/footer ออก ลด navigation ซ้ำ และยังเข้าถึง Health/Kill switch บนมือถือได้
- รักษา approved direction: พื้นขาว, navy/blue/lavender/mint, accent เหลืองเล็กน้อย, card มุมมน, shadow บาง, ภาษาไทยอ่านง่าย และ touch target หลักอย่างน้อย 44px
- UI เป็นงานใหม่ของ KruPo ไม่คัดลอกภาพแบบ pixel-by-pixel

## Database / RLS / Index audit

- มี 5 migration files และ 54 physical tables ตาม domain หลัก
- เปิด RLS ครบตาม migration loop; user/creator financial rows จำกัดตามเจ้าของข้อมูล
- `media_secure_targets` และ `media_files` ถูก revoke จาก anon/authenticated
- privileged RPC ให้ execute เฉพาะ service role
- payment event unique, active entitlement unique และ ledger/audit ห้าม update/delete
- มี catalog trigram/index, status/creator/order/ledger/link/audit/claim/submission indexes
- แก้ balance cache ให้ payout/reversal ลด available balanceแล้ว
- ยังเป็น static SQL audit จนกว่าจะ apply และทดสอบบน Supabase Staging จริง

## Bugs ที่พบและแก้แล้ว

- แยก Playwright Desktop/Mobile project และแก้ locator ที่ชน element ซ้ำ
- แก้ mobile filter ที่ยาวเต็มหน้า
- แก้ Admin chrome/navigation ซ้ำ
- แก้ CSP สำหรับ dev runtime โดยไม่เพิ่ม allowance ใน production
- แก้ empty optional env และ bootstrap ESM/server-only issue
- แก้ media detail query จากการค้นเพียง 60 รายการแรกเป็น query ตาม slug
- แก้ submission ให้ resolve subject/media type/grade foreign keys
- เพิ่ม same-origin guard, mutation rate limits และ rate limit ให้ Creator application
- เพิ่ม role gate ราย Admin section และ auth guard พร้อม return path ให้ private pages
- แก้ creator balance cache ให้รวม payout/reversal
- เพิ่ม grants/revokes/indexes ที่ตรงกับ query จริง
- แก้ CI ให้ใช้ pnpm 11.19.0
- แยก `APP_ENV` ทำให้ Staging ใช้ mock ได้ แต่ Production ยังเปิดไม่ได้

## Bugs/Risks ที่ยังเหลือ

- Critical UI journeys ที่ระบุในหัวข้อ “ยังขาด” ยังไม่เชื่อม transaction จริงครบ
- OpenNext Node.js Proxy support บน Cloudflare เป็น experimental
- SQL/provider integration ยังไม่ผ่าน target platform เพราะไม่มี credentials
- in-memory rate limiter เหมาะกับ dev/test/staging smoke เท่านั้น; Production fail-closed
- file safety ยังต้องมี scanner จริงหรือ manual clean decision ที่บันทึกและ block publish

## Credentials ที่เจ้าของต้องเตรียม

ใช้เฉพาะ Staging/Sandbox และใส่ผ่าน secret manager ห้ามส่งทางแชตหรือ commit:

- Supabase: Project URL, publishable/anon key, **secret/service-role key**, project ref, Owner bootstrap email
- Google Login: Client ID และ **Client Secret** ใส่ใน Supabase Auth
- Google Drive: Client ID, **Client Secret**, **Refresh Token**, private root folder ID
- Cloudflare: Account ID, **least-privilege API Token**, workers.dev URL, **MEDIA_URL_ENCRYPTION_KEY** อย่างน้อย 32 random bytes
- Stripe Test/Sandbox: **`sk_test_...`**, `pk_test_...`, **`whsec_...`**; ห้ามใช้ live keys

รายละเอียด authoritative อยู่ใน `EXTERNAL_CREDENTIALS_REQUIRED_TH.md` ที่ root ของ repository โดยอ้างอิง [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Cloudflare Wrangler variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/), [Stripe API keys](https://docs.stripe.com/keys), [webhook signature](https://docs.stripe.com/webhooks/signature) และ [PromptPay](https://docs.stripe.com/payments/promptpay)

## ขั้นตอนเชื่อม Supabase

1. สร้าง Supabase Staging project แยกจาก Production
2. ใส่ URL, publishable key และ secret/service-role key ใน Staging secret store
3. Link CLI ด้วย project ref แล้ว apply migration 001–005 ตามลำดับ
4. เปิด Email verification; ตั้ง Site URL/redirect สำหรับ `/auth/callback`
5. สร้างผู้ใช้ทดสอบทุก role และทดสอบ bootstrap Owner + audit log
6. รัน RLS adversarial tests, auth flows และ Playwright external E2E ซ้ำ

## ขั้นตอนเชื่อม Google Drive

1. เปิด Drive API และสร้าง OAuth web client สำหรับ Staging
2. ขอ offline access ด้วย scope เท่าที่จำเป็น เช่น `drive.file`
3. เก็บ client secret/refresh token ใน encrypted secret store
4. สร้าง private root folder แยก temporary/permanent/rejected retention และห้าม public sharing
5. ตั้ง `STORAGE_PROVIDER=google_drive` แล้วทดสอบ upload→validate/hash→review→move→authorized download→retention delete

## ขั้นตอนเชื่อม Cloudflare

1. ใช้ least-privilege API token และ account ID ของเจ้าของ
2. ตั้ง `APP_ENV=staging`, public vars และ encrypted secrets; ยังใช้ workers.dev
3. Build/Preview/Smoke Test เท่านั้นในรอบนี้ ไม่เรียก production deploy
4. ตรวจ Proxy/Auth routing, no-store, headers และ background job bindings บน Worker จริง
5. เพิ่ม distributed rate-limit adapter ก่อน Production

## ขั้นตอนเชื่อม Stripe

1. ใช้ Stripe Sandbox/Test mode เท่านั้น และเปิด PromptPay สำหรับ THB
2. ใส่ `sk_test_`, `pk_test_` และสร้าง Staging webhook endpoint `/api/payments/webhook`
3. เก็บ webhook signing secret เป็น encrypted secret
4. ตั้ง `PAYMENT_PROVIDER=stripe` เฉพาะ Staging แล้วทดสอบ signed/fake/duplicate webhook, amount mismatch, expiry และ refund
5. ตรวจว่า order, payment, entitlement, ledger และ creator earning commit/reverse ถูกต้องก่อน sign-off

## ไฟล์ส่งมอบใน repository

- `STAGING_CHECKLIST_TH.md`
- `EXTERNAL_CREDENTIALS_REQUIRED_TH.md`
- `docs/STAGING_READINESS_AUDIT_TH.md`
- `docs/WORKSPACE_AUDIT_TH.md`
- `IMPLEMENTATION_PLAN_TH.md`

## ข้อสรุปสุดท้าย

ระบบ **พร้อมสำหรับ Local staging QA** แต่ **ยังไม่พร้อม Hosted Staging sign-off** และ **ยังไม่พร้อม Production** การทำงานหยุดก่อน Production deployment ตามข้อกำหนด ไม่มีการสร้างบริการเสียเงิน ไม่มีการใช้เงินจริง และไม่มีการ Deploy Production
