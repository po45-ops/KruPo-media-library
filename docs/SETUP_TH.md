# คู่มือตั้งค่าระบบ

## Local development

1. ใช้ Node.js 22+ และ pnpm
2. คัดลอก `.env.example` เป็น `.env.local`
3. ถ้ายังไม่มีบริการภายนอก ให้ใช้ `PAYMENT_PROVIDER=mock`, `STORAGE_PROVIDER=local_test`, `COPYRIGHT_AI_PROVIDER=BASIC`
4. รัน `pnpm install` แล้ว `pnpm bootstrap`
5. เปิด `pnpm dev` และเข้า `http://localhost:3000`

## Supabase

สร้างโปรเจกต์แยก development/staging/production แล้วใช้ migration ทุกไฟล์ตามลำดับ ห้ามแก้ production database สด เปิด Email verification และเพิ่ม Google provider เมื่อมี OAuth credential ค่า callback ใช้ `${NEXT_PUBLIC_APP_URL}/auth/callback`

กำหนด `BOOTSTRAP_ADMIN_EMAIL` เป็นอีเมล Owner ตัวจริง เมื่อบัญชีนี้ login สำเร็จครั้งแรก server จะเพิ่ม `owner` และเขียน audit log

## Credential ที่ระบบไม่สร้างแทนเจ้าของ

- Supabase URL, anon key, service-role key และ project ref
- Google OAuth / Google Drive OAuth refresh token และ root folder ID
- Stripe Thailand account/KYC, secret key, webhook secret, publishable key
- Cloudflare account ID/API token และ workers.dev subdomain

เก็บทั้งหมดใน secret manager ของ environment ห้ามใส่ใน repository หรือหน้า Admin
