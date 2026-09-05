# Checklist ความพร้อม Staging — KruPo คลังสื่อ

อัปเดต: 3 กันยายน 2569 (Asia/Bangkok)

สถานะนี้หมายถึง **Hosted Staging ที่ทดสอบ integration จริง** ไม่ใช่เพียง build ผ่านในเครื่อง และเอกสารนี้ไม่อนุญาตให้ Deploy Production หรือเปิดใช้เงินจริง

## A. ผ่านแล้วใน Local staging mode

- [x] ใช้ Next.js App Router, React, strict TypeScript, Tailwind และ pnpm lockfile
- [x] UI ภาษาไทยและ responsive ตาม visual direction: white / blue / lavender / mint, rounded cards, clean Thai marketplace
- [x] หน้า Public, Auth, Creator, Admin, Health, Copyright และ Legal routes สร้างครบระดับโครงหน้า
- [x] Catalog ฝั่ง server อ่านเฉพาะ `published`/`degraded` และไม่ select secure target
- [x] Fixture ปรากฏเฉพาะ development; production build ไม่แสดง fixture และ migration seed ทุกชิ้นเป็น `draft`
- [x] Provider boundaries: Storage, Payment, Copyright และ File Safety
- [x] LocalTestStorage รองรับ upload/download/delete/exists/metadata/move/copy
- [x] เงินคำนวณเป็น integer satang; order pricing และ commission snapshot มาจากฐานข้อมูลฝั่ง server
- [x] Payment webhook ตรวจ signature ผ่าน provider และใช้ event ID/transaction สำหรับ idempotency
- [x] Entitlement ผูก user ID และ active entitlement มี unique partial index
- [x] Ledger และ Admin audit เป็น append-only; refund ใช้ reversal
- [x] `/go/[mediaId]` และ download ตรวจสิทธิ์ฝั่ง server พร้อม `no-store`
- [x] Zod validation, same-origin mutation check, security headers และ production provider guard
- [x] แยก `APP_ENV=staging` ออกจาก `NODE_ENV=production`; Hosted Staging ใช้ mock/local adapter ได้ แต่ `APP_ENV=production` ปฏิเสธ mock และ local storage
- [x] RLS migration, explicit grants/revokes และ indexes ผ่าน static contract tests
- [x] Secret pattern scan ใน source ไม่พบค่าจริง; repository ยังไม่มี commit history
- [x] Dependency audit ไม่พบ known vulnerability
- [x] Local visual QA: Desktop 1280px ไม่มี horizontal overflow; Login และ Admin แยก chrome ถูกต้อง
- [x] Playwright แยก Desktop/Mobile projects และตรวจ touch target เมนูมือถืออย่างน้อย 44px

## B. ต้องทำเมื่อได้รับ External credentials

- [ ] สร้าง Supabase **Staging project** แยกจาก Production
- [ ] Link Supabase CLI แล้วรัน migrations 001–005 บน Staging
- [ ] ตรวจ SQL migration ด้วย PostgreSQL จริงและเก็บผล migration log
- [ ] รัน RLS adversarial tests ด้วยผู้ใช้ A/B, creator A/B และทุก admin role
- [ ] เปิด Email verification และ Google provider ใน Supabase Auth
- [ ] ทดสอบ register, login, Google OAuth, callback, logout และ password reset จริง
- [ ] สร้างบัญชีทดสอบ owner/admin/reviewer/moderator/finance/support/creator/user
- [ ] ทดสอบ `BOOTSTRAP_ADMIN_EMAIL` login ครั้งแรกและตรวจ audit record
- [ ] สร้าง Google Drive folder สำหรับ Staging และ OAuth consent/client แยกจาก Production
- [ ] ทดสอบ Drive upload → temporary → approve → move permanent → download → delete retention
- [ ] ต่อ malware scanner จริง หรือกำหนดขั้นตอน manual safety review ที่ fail-closed ก่อน publish
- [ ] สร้าง Stripe Sandbox/Test endpoint เท่านั้น และเปิด PromptPay ใน test mode
- [ ] ทดสอบ PaymentIntent, QR, signed webhook, duplicate webhook, amount mismatch และ refund test mode
- [ ] ทดสอบ entitlement, My Library และ ledger ด้วย transaction จริงใน Staging DB
- [ ] ตั้ง distributed rate limiter บน Cloudflare; production ปัจจุบัน fail-closed ถ้ายังไม่มี adapter
- [ ] ตั้ง scheduled jobs สำหรับ link health, reconciliation, notification, payout และ backup
- [ ] ทดสอบ link health กับ 200/302/403/404/410/429/timeout และ platform incident
- [ ] ทดสอบ copyright claim → hold → creator evidence → moderator decision → strike
- [ ] ตรวจ backup/restore drill บน Staging และบันทึก RTO/RPO ที่ทำได้จริง
- [ ] รัน Playwright integration suite อีกรอบโดยใช้บัญชีและข้อมูล Staging จริง
- [ ] รัน Cloudflare Preview/Smoke Test ที่ `workers.dev` โดยยังไม่รับเงินจริง

## C. Functional gaps ที่ต้องปิดก่อน Hosted Staging sign-off

- [ ] Cart UI ต้องอ่าน/เพิ่ม/ลบจากตาราง `carts` และ `cart_items` จริง; ปุ่ม checkout ต้องเรียก `/api/orders`
- [ ] Checkout UI ต้องรับ payment session และแสดงสถานะจาก provider จริง/Stripe test mode
- [ ] My Library ต้องอ่าน `entitlements` จริงแทนรายการ fixture ใน development
- [ ] Creator dashboard ต้องอ่านยอดขาย/ledger/balance/review จริง
- [ ] Admin dashboard/list pages ต้องอ่านข้อมูลจริงและมี action controls ที่เรียก API พร้อม reason/audit
- [ ] Admin feature flags/kill switches ต้องแก้ค่าจริงจาก UI; ตอนนี้มี API แต่ dashboard ยังเป็น status presentation
- [ ] Admin import/export CSV ต้องมี parser, preview, validation, transaction rollback และ export จริง
- [ ] Copyright evidence upload และ creator counter-evidence ต้องเก็บผ่าน StorageProvider
- [ ] Notification delivery และ background job runner/scheduler ต้องเชื่อม execution platform
- [ ] Search ต้องเพิ่ม server pagination และ filters ระดับ/creator/verified/protected/sort ครบ
- [ ] Cover/preview จาก private storage ต้องมี signed/authorized delivery path
- [ ] Share buttons ต้องต่อ Copy/LINE/Facebook/Native Share จริงและเพิ่ม dynamic social preview
- [ ] เพิ่ม logout, reset-password completion และ account management flow
- [ ] เพิ่ม Cloudflare distributed rate-limit adapter และ DNS rebinding protection สำหรับ link checker

## D. Quality gates ที่ต้องผ่านทุกครั้ง

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm cf:build
pnpm audit --prod
```

ผลรอบล่าสุดใน Local:

- `pnpm lint`: ผ่าน ไม่มี warning
- `pnpm typecheck`: ผ่าน
- `pnpm test`: 8 test files / 42 tests ผ่าน
- `pnpm build`: ผ่าน
- `pnpm test:e2e`: 18 tests ผ่านหลังแก้ test matrix และ locator; รันยืนยันซ้ำจาก source ล่าสุดแล้ว
- `pnpm cf:build`: ผ่าน และสร้าง `.open-next/worker.js`; มีคำเตือนว่า Node.js Proxy support ใน OpenNext/Cloudflare ยัง experimental จึงต้องพิสูจน์บน Hosted Staging
- `pnpm audit --prod`: ไม่พบ known vulnerability
- `pnpm bootstrap`: ผ่านใน local mode พร้อมเตือน Database/Auth, Storage และ Payment ว่ายังใช้ local/mock

## E. Go / No-Go

- **Local staging mode:** GO สำหรับพัฒนาและตรวจ UI/contract โดยใช้ Mock Payment + LocalTestStorage
- **Hosted Staging:** NO-GO จนกว่าจะมี Supabase Staging credentials, apply migration จริง และปิด functional gaps ในหมวด C ที่อยู่ใน critical journey
- **Production:** STOP / NO-GO — ห้าม Deploy และห้ามใช้ live Stripe keys หรือเงินจริงจนมีคำสั่งใหม่
