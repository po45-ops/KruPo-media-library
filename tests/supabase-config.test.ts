import { describe, expect, it } from "vitest";
import { getSupabasePublicConfig } from "@/server/supabase/config";

describe("Supabase runtime configuration", () => {
  it("ต้องมี URL และ publishable key ครบคู่", () => {
    expect(getSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toBeNull();
    expect(getSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "publishable" })).toBeNull();
  });

  it("อ่านค่าจาก runtime environment object", () => {
    expect(getSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "publishable",
    })).toEqual({ url: "https://example.supabase.co", publishableKey: "publishable" });
  });
});
