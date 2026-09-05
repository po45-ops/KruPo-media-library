# Payment, PromptPay และ Ledger

Development/Test ใช้ mock ได้ Production ห้ามใช้ mock หาก Stripe credential ยังไม่พร้อมให้ตั้ง `PAYMENT_PROVIDER=disabled` และแสดง “ระบบชำระเงินกำลังเปิดให้บริการ”

Stripe provider สร้าง PaymentIntent สกุล THB และ `payment_method_types=[promptpay]` Webhook ต้องผ่าน signature ก่อนเรียก transaction ในฐานข้อมูล Event ID unique ป้องกัน entitlement/ledger ซ้ำและตรวจ amount เท่ากับ order/payment ที่ lock แล้ว

Refund ไม่แก้ยอดเดิม แต่สร้าง `refund_creator/refund_platform` ที่อ้าง `reverses_entry_id`; payout เป็น entry ติดลบอ้าง payout record ทุกเงินใช้ integer satang
