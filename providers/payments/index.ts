import "server-only";
import { readRuntimeEnv } from "@/server/runtime-env";
import type { PaymentProvider } from "./payment-provider";
import { MockPaymentProvider } from "./mock-payment";
import { StripePromptPayProvider } from "./stripe-promptpay";
import { DisabledPaymentProvider } from "./disabled-payment";

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const env = await readRuntimeEnv();
  if (env.PAYMENT_PROVIDER === "mock") return new MockPaymentProvider();
  if (env.PAYMENT_PROVIDER === "stripe") {
    return new StripePromptPayProvider(env.STRIPE_SECRET_KEY!, env.STRIPE_WEBHOOK_SECRET!, env.STRIPE_REFUND_INSTRUCTIONS_EMAIL);
  }
  return new DisabledPaymentProvider();
}
