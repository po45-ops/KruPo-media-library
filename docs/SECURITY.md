# Security Model

- Supabase session ตรวจ server-side; role จาก `user_roles` เท่านั้น Owner override ถูกบันทึก audit
- RLS แยกข้อมูล User A/B; `media_secure_targets` และ `media_files` ไม่มี client policy
- Price/commission/payment status ไม่เชื่อ client; webhook signature + event ID + DB transaction
- AES-GCM ป้องกัน Game URL at rest; `/go` ตรวจ status/access/entitlement และตอบ `no-store`
- Paid files ไม่มี public URL; download ผ่าน server → entitlement → StorageProvider stream
- CSP, HSTS, frame deny, no-sniff, referrer และ permissions policy
- Upload ตรวจ MIME + extension + size + checksum; Production approval ต้องมี malware status `clean`
- Link checker บล็อก localhost/private IP literals เพื่อลด SSRF; production ควรเสริม DNS resolution/rebinding protection ที่ edge
- Rate limiting interface แยก distributed production implementation; in-memory ใช้ dev เท่านั้น
- Audit/ledger มี trigger ป้องกัน update/delete
- Export ห้ามมี password, service-role, OAuth token, Stripe secret หรือ encrypted target

ก่อน Production ต้องทำ dependency audit, secret scan, RLS integration tests, OWASP abuse tests, Stripe replay test และ review CSP ให้ลด `unsafe-inline` หาก build/runtime รองรับ nonce ครบ
