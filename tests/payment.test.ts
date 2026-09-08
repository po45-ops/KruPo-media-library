import { describe, expect, it } from "vitest";
import Stripe from "stripe";
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
  it("Stripe payment_intent.payment_failed map เป็น failed", async () => {
    const secret = "whsec_test_mapping";
    const payload = JSON.stringify({
      id: "evt_payment_failed",
      object: "event",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_payment_failed",
          object: "payment_intent",
          amount: 1000,
          status: "requires_payment_method",
          metadata: { order_id: "11111111-1111-4111-8111-111111111111" },
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const stripe = new StripePromptPayProvider("stripe-secret-placeholder", secret);

    await expect(stripe.verifyWebhook(payload, signature)).resolves.toMatchObject({
      kind: "payment",
      status: "failed",
      rawType: "payment_intent.payment_failed",
    });
  });
  it("Stripe refund.updated finalize เมื่อ provider ยืนยัน succeeded", async () => {
    const secret = "whsec_test_refund_updated";
    const payload = JSON.stringify({
      id: "evt_refund_updated",
      object: "event",
      type: "refund.updated",
      data: { object: { id: "re_test", object: "refund", amount: 1500, status: "succeeded", payment_intent: "pi_test", failure_reason: null } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const stripe = new StripePromptPayProvider("stripe-secret-placeholder", secret);

    await expect(stripe.verifyWebhook(payload, signature)).resolves.toEqual({
      kind: "refund",
      eventId: "evt_refund_updated",
      providerRefundId: "re_test",
      providerPaymentId: "pi_test",
      status: "succeeded",
      amountSatang: 1500,
      rawType: "refund.updated",
      failureReason: undefined,
    });
  });
  it("Stripe refund.failed คงสถานะ failed และเหตุผลจาก provider", async () => {
    const secret = "whsec_test_refund_failed";
    const payload = JSON.stringify({
      id: "evt_refund_failed",
      object: "event",
      type: "refund.failed",
      data: { object: { id: "re_failed", object: "refund", amount: 1500, status: "failed", payment_intent: "pi_test", failure_reason: "declined" } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const stripe = new StripePromptPayProvider("stripe-secret-placeholder", secret);

    await expect(stripe.verifyWebhook(payload, signature)).resolves.toMatchObject({
      kind: "refund",
      status: "failed",
      rawType: "refund.failed",
      failureReason: "declined",
    });
  });
});
