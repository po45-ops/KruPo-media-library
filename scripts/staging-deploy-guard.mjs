const failures = [];

if (process.env.APP_ENV !== "staging") failures.push("APP_ENV=staging");
if (process.env.CONFIRM_STAGING_DEPLOY !== "KRUPO_STAGING_ONLY") failures.push("CONFIRM_STAGING_DEPLOY=KRUPO_STAGING_ONLY");

const paymentProvider = process.env.PAYMENT_PROVIDER ?? "disabled";
if (!new Set(["disabled", "mock", "stripe"]).has(paymentProvider)) failures.push("PAYMENT_PROVIDER ไม่ถูกต้อง");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (stripeSecret?.startsWith("sk_live_") || stripePublishable?.startsWith("pk_live_")) {
  failures.push("Staging ห้ามใช้ Stripe Live key");
}
if (paymentProvider === "stripe" && (!stripeSecret?.startsWith("sk_test_") || !stripePublishable?.startsWith("pk_test_"))) {
  failures.push("Stripe บน Staging ต้องใช้ Test key เท่านั้น");
}

if (process.env.CF_ENV === "production" || process.env.CONFIRM_PRODUCTION_DEPLOY) {
  failures.push("พบตัวแปร Production ในคำสั่ง Staging");
}

if (failures.length) {
  console.error(`Staging deploy ถูกปฏิเสธ: ${[...new Set(failures)].join(", ")}`);
  process.exit(1);
}

console.log("Staging safety guard ผ่าน: ไม่ใช้ Production และไม่ใช้ Stripe Live");
