# Backup, Restore และ Storage Migration

## Strategy

- Supabase: เปิด scheduled database backup ตามแผนบริการ + export รายวันของข้อมูลธุรกิจสำคัญแบบเข้ารหัส
- Google Drive: แยก temporary/permanent/backup, เก็บ checksum และ file ID ใน DB, จำกัด OAuth account/folder
- เก็บ migration และ release tag ทุกครั้ง; audit/ledger/order ห้ามตัดทิ้ง

## Restore test (อย่างน้อยรายไตรมาส)

1. สร้าง isolated restore project
2. Restore snapshot แล้วรัน migrations ที่ใหม่กว่า
3. ตรวจ count/checksum ของ order, entitlement, ledger, media files
4. สุ่มดาวน์โหลด private file ผ่าน server flow
5. รัน reconciliation และ smoke tests
6. บันทึก RTO/RPO, ผู้ทดสอบ, ปัญหา และ action ในรายงาน

## เปลี่ยน Storage Provider

คัดลอกผ่าน `StorageProvider.copy/download/upload`, ตรวจ checksum, เขียน media file version ใหม่, สลับ active pointer หลังตรวจครบ และเก็บของเดิมจนพ้น rollback window ห้ามเปลี่ยนเป็น public link
