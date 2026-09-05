# รายงาน Audit Workspace — KruPo คลังสื่อ

วันที่ตรวจ: 3 กันยายน 2569 (Asia/Bangkok)

## ผลการตรวจ

- Workspace เริ่มต้นว่าง ไม่มี repository, source code, migration, package lock หรือ secret เดิม
- เอกสารอ้างอิง `KruPo_คลังสื่อ_คู่มือและคำสั่ง_Codex_ฉบับเต็ม (1).docx` อ่านครบ 884 ย่อหน้า 4 ตาราง และมีภาพอ้างอิงภายใน 5 ภาพ
- ภาพแนบภายนอก 7 ภาพกำหนด visual direction ของหน้าแรก, catalog, detail, cart/checkout, library, auth และ admin
- ไม่มี credential ภายนอกใน workspace และไม่ได้คัดลอก credential จากเอกสาร/เครื่องผู้ใช้

## ลำดับอำนาจของข้อกำหนด

1. คำขอล่าสุดของผู้ใช้ในบทสนทนานี้
2. ข้อกำหนดใน DOCX ที่ไม่ขัดกับคำขอล่าสุด
3. ภาพแนบ ใช้เป็น visual direction ไม่ใช่ source code หรือ asset ที่คัดลอก

## ความแตกต่างที่ตัดสินแล้ว

| หัวข้อ | DOCX เดิม | คำขอล่าสุด | การนำไปใช้ |
|---|---|---|---|
| Storage หลัก | Cloudflare R2 | Google Drive รุ่นแรก, R2 ในอนาคต | ใช้ `StorageProvider`; Google Drive เป็น production V1; R2 เป็น future adapter |
| Roles | user, admin | 8 roles รวม creator/reviewer/finance | ใช้ role model ล่าสุดและตรวจฝั่ง server |
| Marketplace | เน้นคลังของ Admin | Creator marketplace เต็มรูปแบบ | ใช้ submission, review, commission, ledger, payout, strike |
| สถานะสื่อ | draft/published/archived | workflow ละเอียดขึ้น | ใช้ draft/reviewing/published/degraded/suspended/archived |
| Admin คนแรก | admin | owner | `BOOTSTRAP_ADMIN_EMAIL` bootstrap เป็น owner พร้อม audit |
| การส่งมอบ | production URL | พร้อม Staging; ห้าม production | สร้าง staging config/runbook เท่านั้น ไม่ deploy |

## ความเสี่ยงเริ่มต้น

- Google Drive API, Supabase, Stripe PromptPay และ Cloudflare ต้องใช้ credential จริงก่อน staging integration test
- External URL secrecy ป้องกันได้ก่อนอนุญาตเท่านั้น หลัง redirect ผู้ใช้เห็น URL ปลายทางได้
- ข้อความ Seller Agreement/Privacy/Refund/Copyright เป็น template ต้องผ่านผู้เชี่ยวชาญกฎหมายก่อน Production
- Malware scanning บน Cloudflare Worker ต้องใช้ scanner/provider ภายนอกหรือ quarantine pipeline; V1 เตรียม interface และ fail-closed workflow
- Cloudflare adapter และ Next.js ต้องตรวจ compatibility ซ้ำก่อน production เนื่องจาก ecosystem มีการเปลี่ยนรุ่นต่อเนื่อง

## ขอบเขตความปลอดภัย

- ไม่ deploy production
- ไม่ใช้เงินจริง
- development/test ใช้ mock payment และ local-test storage ได้
- production guard ปฏิเสธ mock payment, local-test storage และ secret ที่ไม่ครบ
- ห้ามเก็บ secure target/public paid file URL ใน client payload
