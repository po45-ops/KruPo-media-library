import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readEnv } from "@/server/env";

describe("production safety", () => {
  it("ไม่ให้ production เปิด mock payment หรือ local storage", () => {
    expect(() => readEnv({ NODE_ENV: "production", APP_ENV: "production", NEXT_PUBLIC_APP_URL: "https://krupo.example", PAYMENT_PROVIDER: "mock", STORAGE_PROVIDER: "local_test" })).toThrow();
  });

  it("ให้ hosted staging ใช้ mock adapter ได้โดยไม่ปลอมเป็น production", () => {
    const env=readEnv({ NODE_ENV: "production", APP_ENV: "staging", NEXT_PUBLIC_APP_URL: "https://staging.example", PAYMENT_PROVIDER: "mock", STORAGE_PROVIDER: "local_test" });
    expect(env.APP_ENV).toBe("staging");
  });

  it("production เปิด staging fixtures ไม่ได้", () => {
    expect(() => readEnv({ NODE_ENV: "production", APP_ENV: "production", ALLOW_STAGING_DEMO_DATA: "true", NEXT_PUBLIC_APP_URL: "https://krupo.example", PAYMENT_PROVIDER: "stripe", STORAGE_PROVIDER: "google_drive", RATE_LIMIT_PROVIDER: "cloudflare" })).toThrow();
    const source = readFileSync("features/catalog/demo-media.ts", "utf8");
    expect(source).toContain('process.env.APP_ENV === "staging"');
    expect(source).toContain('process.env.ALLOW_STAGING_DEMO_DATA === "true"');
  });

  it("migration demo media ทั้งหมดเป็น draft", () => {
    const seed = readFileSync("supabase/migrations/202609030003_thai_views_comments_seed.sql", "utf8");
    const publishedSeed = /'demo-[^']+'[\s\S]*?'published'/i.test(seed);
    expect(publishedSeed).toBe(false);
    expect(seed.match(/'draft'/g)?.length).toBe(6);
  });

  it("production deploy ต้องมี explicit confirmation", () => {
    const guard = readFileSync("scripts/production-deploy-guard.mjs", "utf8");
    expect(guard).toContain('CONFIRM_PRODUCTION_DEPLOY!=="I_UNDERSTAND"');
    expect(guard).toContain('APP_ENV!=="production"');
  });
});
