# คู่มือแก้ปัญหา

- หน้าเว็บได้แต่ login ไม่ได้: ตรวจ Supabase URL/anon key, callback URL และ email verification
- Owner ไม่เกิด: ตรวจ `BOOTSTRAP_ADMIN_EMAIL` ให้ตรงบัญชีโดยไม่แสดงค่าใน client แล้ว login ใหม่ ดู server/audit log
- Upload ไม่ได้: ตรวจ upload/google_drive_upload flag, Drive OAuth/root folder/quota และ temporary retention
- Checkout ปิด: ตรวจ new_orders/payment flag; Production ไม่มี Stripe ต้องปิด ไม่ใช้ mock
- Webhook 400: ตรวจ endpoint, raw payload, Stripe signature secret และ event replay
- ซื้อแล้วไม่เห็นสื่อ: รัน reconciliation ตรวจ order/payment/event/entitlement ใน transaction เดียว ห้าม grant แบบไม่มีเหตุผล
- เกม 403: 403 เป็น warning ไม่ใช่ broken ทันที ตรวจด้วย GET จำกัดข้อมูลและ manual verification
- Download ไม่ได้แต่ catalog ปกติ: ตรวจ storage health/file active/entitlement; อย่าปิดทั้งระบบ
- AI เกินงบ: ระบบต้องลดเป็น Basic + Manual Review
- Migration ล้มเหลว: ห้ามแก้ DB สด ให้แก้ migration/forward-fix ใน staging และ backup ก่อนทุกครั้ง
