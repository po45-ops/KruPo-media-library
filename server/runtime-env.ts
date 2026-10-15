import "server-only";
import { readEnv, type AppEnv } from "@/server/env";

type WorkerBindings = Record<string, unknown>;
const runtimeConfigKeys: readonly (keyof AppEnv)[] = [
  "NODE_ENV", "APP_ENV", "ALLOW_STAGING_DEMO_DATA", "NEXT_PUBLIC_APP_NAME", "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "BOOTSTRAP_ADMIN_EMAIL",
  "GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_FOLDER_ID",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_REFUND_INSTRUCTIONS_EMAIL",
  "PAYMENT_PROVIDER", "STORAGE_PROVIDER", "RATE_LIMIT_PROVIDER", "COPYRIGHT_AI_PROVIDER",
  "COPYRIGHT_AI_MONTHLY_BUDGET_SATANG", "MINIMUM_CHECKOUT_SATANG", "MEDIA_URL_ENCRYPTION_KEY",
  "LINK_CHECK_CONCURRENCY", "LINK_FAILURE_THRESHOLD", "LINK_SUSPEND_THRESHOLD", "LINK_REPAIR_SLA_HOURS",
  "CREATOR_HOLD_DAYS", "MINIMUM_PAYOUT_SATANG",
];

export function mergeWorkerBindings(
  base: Record<string, string | undefined>,
  bindings: WorkerBindings,
): Record<string, string | undefined> {
  const runtimeValues: Record<string, string | undefined> = { ...base };
  for (const key of runtimeConfigKeys) {
    const value = bindings[key];
    if (typeof value === "string") runtimeValues[key] = value;
  }
  return runtimeValues;
}

export async function readRuntimeEnv(): Promise<AppEnv> {
  let bindings: WorkerBindings;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    // The Worker request context is already bound to global scope in deployed OpenNext Workers.
    // Async mode is for Node.js/next dev and cannot resolve the active Worker binding context.
    const context = getCloudflareContext();
    bindings = context.env as unknown as WorkerBindings;
  } catch {
    const stripeConfigured = process.env.PAYMENT_PROVIDER === "stripe";
    const stripeSecretsMissing = !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET;
    if (stripeConfigured && stripeSecretsMissing) {
      throw new Error("ไม่สามารถอ่าน Stripe Staging bindings จาก server runtime ได้");
    }
    return readEnv();
  }
  return readEnv(mergeWorkerBindings(process.env, bindings));
}
