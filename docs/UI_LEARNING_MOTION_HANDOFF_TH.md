# จุดบันทึกงาน UI Learning in Motion

วันที่ 28 กันยายน 2026 — ทำต่อบน repository เดิม ไม่สร้างระบบใหม่

## สิ่งที่บันทึกใน source แล้ว

- หน้าแรกเป็นฉากการเรียนรู้มีมิติด้วย CSS พร้อมภาพเคลื่อนไหวตามการเลื่อน 3 ช่วง มีปุ่มข้ามไปล็อกอิน/คลังสื่อ ปุ่มหยุดการเคลื่อนไหว และรองรับ reduced motion
- หน้า login/register ใช้ฟอร์มและ API เดิม เพิ่มการแสดง/ซ่อนรหัสผ่านและรักษา return path ไม่เพิ่มระบบยืนยันตัวตนจำลอง
- ปรับโทนสี ฟอนต์ไทย navigation บนมือถือ การ์ดสื่อ หน้าบัญชี และส่วนหัว Creator ให้สอดคล้องกัน
- การเรียงสื่อเชื่อมกับ repository จริง พร้อม whitelist ของ sort และ unit tests; local fallback ใช้การเรียงแบบเดียวกัน
- ปุ่มแชร์ใช้งาน copy/native share/LINE/Facebook และปุ่มสื่อไฟล์ฟรีชี้ไป download API เดิมที่ตรวจสิทธิ์ฝั่ง server
- เอฟเฟกต์เปลี่ยนหน้าเป็น route entrance ไม่ใช่ shared-element portal animation เต็มรูปแบบ ภาพเปิดเรื่องเป็น CSS animation ไม่ใช่วิดีโอ

## ผลตรวจรอบนี้

- pnpm lint: ผ่าน
- pnpm typecheck: ผ่าน
- pnpm test: ผ่าน 19 ไฟล์ / 85 tests
- pnpm build: ผ่าน
- Playwright local: public + mobile + learning-journey ผ่าน 19 tests
- ตรวจ 9 routes ที่ขนาด 1440px และ 390px: HTTP 200 ไม่มี horizontal overflow และไม่มี page JavaScript error
- Routes ที่ตรวจ: /, /login, /media, /media/quick-math-p4, /account, /my-library, /creator, /admin, /cart
- ภาพตรวจหน้าจออยู่ใน work/ui-learning-motion/ (local artifact)
- แก้ selector ของช่องรหัสผ่านให้ตรงชื่อ เพื่อไม่ชนกับปุ่มแสดงรหัสผ่าน รวมถึงตัวทดสอบ hosted ที่เกี่ยวข้อง แต่ยังไม่ได้รัน hosted tests ในรอบนี้

## ขอบเขตที่ยังไม่ได้ยืนยัน

Local preview http://127.0.0.1:3000 ใช้ development fallback ที่มีอยู่ ไม่ใช่หลักฐานยืนยัน Supabase session, Google OAuth, Drive หรือ payment จริง ชุด UI tests ตรวจโครงสร้างและการนำทาง ไม่ใช่ธุรกรรมภายนอกครบวงจร

ยังไม่ได้รัน OpenNext build หรือ deploy UI ชุดนี้ขึ้น Cloudflare และไม่ได้แก้ Production, secrets, migrations, Stripe Live หรือสร้าง paid resource

## วิธีทำต่อโดยไม่เริ่มใหม่

1. ตรวจ git diff ก่อนเสมอ เพราะ workspace มีงานเดิมด้าน health/payment/runtime และไฟล์อื่นค้างอยู่ก่อนงาน UI รอบนี้ ห้าม reset หรือรวบ commit โดยไม่ตรวจ
2. ตรวจ UI ใหม่กับบัญชี Staging จริง โดยเฉพาะ login → return path → My Library, Creator และ Admin
3. หากจะเผยแพร่ ให้ตรวจ OpenNext build และ guards แล้ว deploy เฉพาะ Hosted Staging ตามการอนุญาต จากนั้นทำ targeted hosted QA
4. เซฟครั้งนี้เป็นไฟล์ในเครื่อง ยังไม่ได้ commit/push จึงยังไม่ใช่สำรองบน GitHub

อย่าอ้างว่า UI ทั้ง 29 หน้าจากต้นแบบถูกสร้างครบแล้ว: รอบนี้เชื่อมหน้าแรก/auth และปรับส่วนใช้งานร่วมกับหน้าที่มีอยู่จริง ไม่ได้สร้างทุกหน้าจากต้นแบบเพิ่ม
