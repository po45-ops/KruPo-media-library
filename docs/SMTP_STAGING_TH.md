# Custom SMTP สำหรับ Supabase Hosted Staging

เอกสารนี้ใช้กับ Supabase project `krupo-platform` (Staging) และ Hosted Staging ของ KruPo เท่านั้น ห้ามนำค่าลับหรือการตั้งค่านี้ไปใช้กับ Production โดยอัตโนมัติ

## สถาปัตยกรรมที่ใช้

- KruPo เรียก Supabase Auth สำหรับสมัครสมาชิกและขอลิงก์ตั้งรหัสผ่าน
- Supabase Auth เป็นผู้สร้าง OTP/TokenHash และส่งอีเมลผ่าน Custom SMTP
- อีเมลยืนยันบัญชีเปิด `/auth/confirm?type=email&next=/my-library`
- อีเมลกู้คืนบัญชีเปิด `/auth/confirm?type=recovery&next=/reset-password`
- `/auth/confirm` ตรวจ TokenHash กับ Supabase ฝั่งเซิร์ฟเวอร์ แล้ว Supabase SSR เขียน session cookie
- `/reset-password` และ API ตั้งรหัสผ่านตรวจ session ฝั่งเซิร์ฟเวอร์, origin และ distributed rate limit
- หลังเปลี่ยนรหัสผ่านสำเร็จ ระบบจบ recovery session และบังคับให้เข้าสู่ระบบใหม่

ระบบยังรองรับลิงก์ Supabase แบบเดิมที่ส่ง session ใน URL fragment ผ่าน `/auth/email-callback` โดยลบ fragment ออกจาก address bar ก่อน finalize session ฝั่งเซิร์ฟเวอร์

## Provider สำหรับ Staging

แนะนำ Resend เพราะมีคู่มือเชื่อม Supabase SMTP โดยตรงและเริ่มทดสอบได้โดยไม่สร้าง resource แบบเสียเงิน ข้อจำกัดสำคัญคือ sender ทดสอบ `onboarding@resend.dev` ส่งได้เฉพาะอีเมลเจ้าของบัญชี Resend เท่านั้น หากต้องส่งให้ผู้ทดสอบหลายคนต้องยืนยันโดเมนของตัวเองก่อน

ค่าที่ Supabase Dashboard ต้องใช้มี Host, Port, Username, Password, Sender email และ Sender name โดย Password/API key เป็น Secret ห้ามบันทึกใน Git, ไฟล์ `.env`, Cloudflare variables หรือเอกสาร

## Email Templates บน Hosted Supabase

นำ Subject และ HTML จากไฟล์ต่อไปนี้ไปตั้งใน Authentication > Email Templates:

- Signup confirmation: `supabase/templates/confirmation.html`
- Reset password / Recovery: `supabase/templates/recovery.html`

ต้องคง `{{ .TokenHash }}` และชนิด `type` ตามไฟล์ ห้ามเปลี่ยนเป็นลิงก์ที่มี token จริงใน source code

## Security checklist

- ใช้ Staging project เท่านั้น
- เปิด SPF, DKIM และ DMARC เมื่อมีโดเมนของตนเอง
- ปิด click/link tracking ของ SMTP provider สำหรับอีเมลยืนยันตัวตน
- ห้ามส่งต่ออีเมล recovery และห้ามบันทึกลิงก์ที่มี token ใน log
- คงข้อความตอบ forgot-password แบบเดียวกันทั้งอีเมลที่มีและไม่มีบัญชี เพื่อป้องกัน account enumeration
- ทดสอบ rate limit และหมดอายุของลิงก์ก่อนเปิด Production

## เกณฑ์ผ่าน

1. สมัครสมาชิกด้วยอีเมล Staging และได้รับอีเมลจริง
2. ลิงก์ยืนยันพาไป My Library พร้อม session ที่ใช้งานได้
3. Logout แล้ว session ใช้ต่อไม่ได้
4. ขอ reset password และได้รับอีเมลจริง
5. ลิงก์ recovery พาไปหน้าตั้งรหัสผ่านใหม่
6. รหัสผ่านเดิมใช้ไม่ได้ รหัสผ่านใหม่ใช้ได้ และ recovery session ถูกจบ
7. `/api/health` ยังคง App/Database/Auth/Storage healthy และ Payment disabled
