# คู่มือผู้ดูแลระบบ

## งานประจำ

หน้า `/admin` แสดง KPI, สิ่งที่ต้องทำวันนี้ และ kill switches หน้าเฉพาะมีสื่อรอตรวจ, ผู้สร้าง, คำสั่งซื้อ, รายได้/การจ่าย, ลิงก์, ลิขสิทธิ์, AI, audit และ health

## การตรวจสื่อ

ตรวจข้อมูลผู้ขาย → file validation/checksum → malware status → Copyright Risk evidence → preview → ตัดสินใจ หากอนุมัติระบบจึงย้ายไฟล์จาก temporary review ไป permanent storage และ publish ห้ามใช้ผล AI เป็นคำรับรองทางกฎหมาย

## เหตุฉุกเฉิน

- Stripe ขัดข้อง: ปิด `new_orders` และ `payment`; สื่อฟรียังทำงาน
- Google Drive ขัดข้อง: ปิด upload/download ที่เกี่ยวข้อง; catalog/auth ยังทำงาน
- Domain/Platform ล่ม: pause specific platform, แจ้ง Creator/User และตรวจ backup
- Copyright claim: hold media, แจ้ง creator, รอ evidence, ให้ moderator ตัดสิน

Critical action ต้องระบุเหตุผลและดูย้อนหลังได้ ห้าม mark paid จากปุ่มธรรมดา ห้ามแก้ ledger และห้าม hard delete สื่อที่เคยมีคำสั่งซื้อ
