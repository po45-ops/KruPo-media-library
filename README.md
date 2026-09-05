# KruPo คลังสื่อ

Production-oriented Thai educational marketplace built with Next.js, TypeScript, Supabase PostgreSQL/Auth, provider abstractions, Google Drive V1 storage, Stripe PromptPay, Vitest and Playwright.

> สถานะ: source code พร้อมสำหรับ local/staging integration แต่ยังไม่ได้ Deploy Production และยังไม่ใช้เงินจริง

## เริ่มต้น

```bash
cp .env.example .env.local
pnpm install
pnpm bootstrap
```

โหมดไม่มี credential ใช้ `PAYMENT_PROVIDER=mock`, `STORAGE_PROVIDER=local_test`, `COPYRIGHT_AI_PROVIDER=BASIC` เฉพาะ development/test หน้า Admin จะแสดง owner จำลองเมื่อไม่มี Supabase และ `NODE_ENV` ไม่ใช่ production

## สถาปัตยกรรม

```text
Cloudflare -> Next.js Web/API -> Supabase PostgreSQL/Auth
                           -> StorageProvider (Google Drive V1 / local-test / R2 future)
                           -> PaymentProvider (Stripe PromptPay / mock dev / disabled)
                           -> CopyrightRiskProvider (Basic / Advanced adapter)
                           -> Background jobs (link health, reconciliation, notifications)
```

เอกสารหลัก: [ตั้งค่า](docs/SETUP_TH.md), [ฐานข้อมูล](docs/DATABASE_TH.md), [Deploy](docs/DEPLOYMENT_TH.md), [Security](docs/SECURITY.md), [Admin](docs/ADMIN_GUIDE_TH.md)
