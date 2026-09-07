# Runbook Google Drive Storage — Hosted Staging

เอกสารนี้ใช้เฉพาะ KruPo Hosted Staging ห้ามใช้ Production, Stripe Live หรือ Google Drive folder ที่ปะปนกับข้อมูลจริง

สถานะ ณ 7 กันยายน 2569: OAuth Desktop app ด้วย scope `drive.file` ผ่านแล้ว, private app-managed root พร้อมใช้งาน และ verifier ผ่านครบ upload, exists, metadata, SHA-256, download, move, copy และ safe delete

## Architecture ที่ใช้อยู่

- ทุก workflow เรียก `StorageProvider` เท่านั้น
- `GoogleDriveStorageProvider` ทำงานเฉพาะ backend/Worker และไม่สร้าง public share link
- Upload เริ่มที่ `temporary/review/<creator-id>/...` หลังผ่าน file validation, SHA-256, Basic Copyright Guard และ explicit file-safety state
- Admin อนุมัติได้เมื่อไฟล์มี `malware_status=clean`; provider ย้ายไฟล์ไป parent folder `permanent/media/<media-id>/...` จริง
- Supabase เก็บ `storage_provider`, `storage_file_id`, `storage_path`, ชื่อ, MIME, ขนาด และ SHA-256 โดยไม่เก็บ public URL
- Download ต้องมี session, media ต้อง `published`/`degraded`, paid media ต้องมี entitlement, และไฟล์ต้องอยู่ `permanent`, `active`, `malware_status=clean`
- Download route เลือก provider จาก record ของไฟล์ ตรวจ metadata/checksum ซ้ำ แล้ว stream body โดยใช้ `private, no-store`

## Security contract ของ Drive folder

- Root folder ต้องเป็น Google Drive folder ที่ account ของ OAuth เพิ่มไฟล์ได้
- Root folder และ parent ทุกชั้นห้ามมี permission ชนิด `anyone` หรือ `domain`
- Provider ไม่เรียก Permissions API เพื่อสร้าง public link
- Provider ยอมรับเฉพาะไฟล์ที่มี `appProperties.krupoRoot` ตรงกับ Staging root
- `exists()` คืน `false` เฉพาะ 404/410; 401/403 ต้องเป็น error เพื่อไม่กลบ credential หรือ permission failure
- `delete()` ย้ายไฟล์ทดสอบเข้า Trash เพื่อให้กู้คืนได้ ไม่ลบถาวร
- Logical path ปฏิเสธ absolute path, `..`, control characters และ segment ผิดรูปแบบ

## Google Cloud Console ที่เจ้าของต้องเตรียม

1. สร้างหรือเลือก Google Cloud Project สำหรับ **KruPo Staging** โดยไม่ผูก Billing หากไม่จำเป็น
2. เปิด **APIs & Services → Library**, ค้นหา **Google Drive API**, กด **Enable**
3. เปิด **Google Auth Platform → Branding** และกรอกชื่อแอป `KruPo Staging`, support email และ developer contact
4. เปิด **Audience**; ถ้าเลือก External ให้คงสถานะ Testing และเพิ่มอีเมลเจ้าของเป็น Test user
5. เปิด **Data Access → Add or remove scopes** แล้วเลือก `https://www.googleapis.com/auth/drive.file` เท่านั้น
6. เปิด **Clients → Create Client → Desktop app**, ตั้งชื่อ `KruPo Staging Local OAuth`
7. กด **Download JSON** แล้วเก็บไฟล์ไว้ในเครื่อง ห้ามส่งเนื้อหา JSON ผ่านแชตหรือ commit ลง Git
8. แจ้ง Codex ว่า “ดาวน์โหลด OAuth Client JSON แล้ว” พร้อมบอกเฉพาะ path ของไฟล์ จากนั้น Codex จะเริ่ม loopback OAuth listener และเปิดหน้า Google ให้เจ้าของกดอนุมัติเอง

Scope `drive.file` จำกัดแอปให้เข้าถึงไฟล์ที่แอปสร้างหรือได้รับอนุญาต Flow จึงสร้าง private root ชื่อ `KruPo Staging App Storage` ผ่าน API หลัง OAuth แทนการใช้ folder ที่ผู้ใช้สร้างล่วงหน้า โฟลเดอร์เดิมไม่ถูกลบหรือเปลี่ยนสิทธิ์

## Secrets สำหรับ Cloudflare Hosted Staging

ตั้งผ่าน Cloudflare encrypted secrets เท่านั้น ห้ามวางค่าจริงใน `wrangler.jsonc`, `.env.example`, source, Git หรือรายงาน:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

ตั้ง `STORAGE_PROVIDER=google_drive` ใน config ของ Hosted Staging หลัง provider integration verification ผ่านแล้ว และ deploy เฉพาะเมื่อ Cloudflare encrypted secrets ครบทั้งสี่รายการ

## Gate หลัง OAuth

โหลด secrets เข้า process แบบไม่แสดงค่า แล้วรัน:

```bash
APP_ENV=staging STORAGE_PROVIDER=google_drive pnpm storage:verify:google-drive:staging
```

Verifier สร้างไฟล์ข้อความสุ่มใน temporary area, ตรวจ upload/exists/metadata/SHA-256/download, ย้าย parent จริง, copy ไป backup, ย้ายไฟล์ทดสอบเข้า Trash และยืนยันว่าไม่เหลือ active test file หลังผ่านแล้วจึงตั้ง Cloudflare secrets, เปลี่ยน provider, build, deploy Hosted Staging และรัน Hosted E2E

## Fail-safe

- OAuth/permission/root health ผิดพลาด: Health API รายงาน Storage `critical`; Database/Auth/Catalog ยังทำงาน
- Drive file ถูกลบหรือ metadata/checksum ไม่ตรง: download ปฏิเสธและไม่สร้าง download log สำเร็จปลอม
- ห้าม downgrade เป็น public URL หรือ disable entitlement/RLS เพื่อแก้ปัญหา
- ห้ามใช้ OAuth token ของ Production ใน Staging
