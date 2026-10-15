import { describe, expect, it } from "vitest";
import { mergeWorkerBindings } from "@/server/runtime-env";

describe("Cloudflare runtime bindings", () => {
  it("prefers runtime secrets over build-time values and ignores non-string bindings", () => {
    const bindings: Record<string, unknown> = {
      STRIPE_SECRET_KEY: "runtime-test-secret",
      RATE_LIMIT_AUTH: { limit: () => ({ success: true }) },
    };
    Object.defineProperty(bindings, "STRIPE_WEBHOOK_SECRET", {
      value: "runtime-webhook-secret",
      enumerable: false,
    });
    const merged = mergeWorkerBindings(
      { APP_ENV: "staging", STRIPE_SECRET_KEY: "stale-build-value" },
      bindings,
    );

    expect(merged.APP_ENV).toBe("staging");
    expect(merged.STRIPE_SECRET_KEY).toBe("runtime-test-secret");
    expect(merged.STRIPE_WEBHOOK_SECRET).toBe("runtime-webhook-secret");
    expect(merged.RATE_LIMIT_AUTH).toBeUndefined();
  });
});
