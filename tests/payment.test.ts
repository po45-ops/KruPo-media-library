import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "@/providers/payments/mock-payment";
import { StripePromptPayProvider } from "@/providers/payments/stripe-promptpay";

describe("payment providers", () => {
  it("mock ใช้ใน test และสร้างสถานะ awaiting_payment", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    const result = await new MockPaymentProvider().createPayment({ orderId: "o", amountSatang: 1000, currency: "thb", description: "t", idempotencyKey: "i" });
    expect(result.status).toBe("awaiting_payment");
  });
  it("Stripe ปฏิเสธ webhook signature ปลอม", async () => {
    const stripe = new StripePromptPayProvider("stripe-secret-placeholder", "webhook-secret-placeholder");
    await expect(stripe.verifyWebhook("{}", "bad")).rejects.toThrow();
  });
});
