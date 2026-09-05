# Deployment และ Staging Runbook

## ลำดับ

Code → Lint → Typecheck → Test → Build → Staging → Smoke Test → Production

โปรเจกต์มี OpenNext Cloudflare config สำหรับ Workers แต่ต้องทดสอบ adapter compatibility อีกครั้งเมื่อจะ deploy เนื่องจาก Cloudflare ecosystem เปลี่ยนเร็ว ใช้ `pnpm cf:preview` เพื่อทดสอบ Workers runtime และ `pnpm cf:deploy` เฉพาะเมื่อได้รับอนุญาต

## Staging

1. สร้าง Supabase staging และใช้ migrations
2. ตั้ง Cloudflare staging secrets โดยไม่ใช้ production credential
3. ใช้ Stripe test keys + PromptPay test flow; ห้ามเงินจริง
4. สร้าง Google Drive staging root folder ที่แยกจาก production
5. ตั้ง `NEXT_PUBLIC_APP_URL` เป็น workers.dev URL ของ staging
6. รัน `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
7. Smoke: homepage, register/verify, Google callback, creator application/submission, review, free/paid access, webhook duplicate, ledger, refund, link checker, health, kill switch

## Production guard

`pnpm cf:deploy` เรียก safety guard ซึ่งปฏิเสธ mock payment, local-test storage, HTTP URL, secret ไม่ครบ และต้องมี `CONFIRM_PRODUCTION_DEPLOY=I_UNDERSTAND` Production สามารถใช้ `PAYMENT_PROVIDER=disabled` เพื่อเปิดเฉพาะสื่อฟรีโดยไม่แกล้งรับเงินจริง

## Rollback

- Code: ใช้ immutable build/version ก่อนหน้าใน Cloudflare
- Database: migration เป็น forward-fix; ห้าม rollback ด้วยการลบ ledger/order
- Storage: ใช้ checksum และ provider metadata ตรวจไฟล์ก่อนสลับ pointer
- Payment: ปิด `new_orders`/`payment` kill switch ก่อนแก้ incident

เอกสารนี้ยังไม่อนุญาตให้ deploy production; ต้องมี approval แยกต่างหาก
