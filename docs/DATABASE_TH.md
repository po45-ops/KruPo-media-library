# ฐานข้อมูล KruPo (ภาษาไทย)

เวลาจัดเก็บเป็น UTC; UI แสดง `th-TH` / `Asia/Bangkok` เงินทุกช่องเป็น integer satang ยกเว้นเปอร์เซ็นต์ commission ที่เป็น `numeric(5,2)` และถูก snapshot ใน order item

## กลุ่มผู้ใช้และผู้สร้าง

- `profiles`, `roles`, `user_roles`: โปรไฟล์และสิทธิ์หลายบทบาท
- `creator_profiles`, `creator_applications`, `creator_verifications`, `creator_trust_history`: lifecycle ผู้สร้าง

## กลุ่มสื่อ

- `subjects`, `grade_levels`, `media_types`: master data ที่ Admin แก้ได้
- `media_items`, `media_grade_levels`, `media_previews`, `media_versions`: catalog และประวัติ
- `media_secure_targets`: URL เกมเข้ารหัส server-only
- `media_files`: provider/file ID/path/name/MIME/size/checksum และ temporary/permanent area
- `media_submissions`, `media_review_results`: workflow และหลักฐานผลตรวจ

## Commerce และสิทธิ์

- `favorites`, `carts`, `cart_items`
- `orders`, `order_items`: สร้างฝั่ง server และ snapshot ราคา/creator/commission/share
- `payments`, `payment_webhook_events`: signature + idempotency
- `entitlements`: ผูก user ID และมี revoke history

## เงินผู้สร้าง

- `commission_rules`, `creator_commission_overrides`
- `financial_ledger_entries`: immutable source of truth
- `creator_earnings`: รายละเอียดต่อ order item
- `creator_balances`: cache ที่สร้างใหม่จาก ledger ไม่ใช่ source of truth
- `payouts`, `payout_items`, `refunds`: payout สะสมและ refund reversal

## Trust, Copyright, Operations

- `creator_reviews`, `media_reviews`, `creator_strikes`
- `copyright_claims`, `copyright_evidence`, `copyright_decisions`, `media_reports`
- `game_launch_logs`, `download_logs`, `media_view_logs`
- `link_health_checks`, `link_url_history`, `platform_incidents`
- `system_settings`, `feature_flags`, `admin_audit_logs`, `notifications`
- `health_check_results`, `background_job_runs`, `ai_usage_events`

## Thai read-only views

`สื่อ`, `ผู้ใช้งาน`, `ผู้สร้าง`, `คำสั่งซื้อ`, `รายการชำระเงิน`, `สิทธิ์การใช้งาน`, `รายได้ผู้สร้าง`, `สถานะลิงก์`, `คำร้องลิขสิทธิ์` จำกัดให้ service role อ่านผ่าน Admin server เท่านั้น

## Functions

- `create_order_secure`: lock/อ่านราคาจาก DB, snapshot commission, ตรวจขั้นต่ำ
- `process_verified_payment_event`: transaction เดียวสำหรับ event/order/payment/entitlement/ledger/earning/audit
- `create_full_refund`: reverse ledger และ revoke entitlement
- `record_manual_payout`: จ่ายจาก ledger ที่ available และถึงขั้นต่ำ
- `refresh_creator_balance_cache`: สร้าง cache จาก ledger ใหม่
