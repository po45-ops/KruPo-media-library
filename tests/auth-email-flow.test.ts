import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase email flows", () => {
  it("ใช้ TokenHash callback สำหรับ signup และ recovery", () => {
    const confirmation = readFileSync("supabase/templates/confirmation.html", "utf8");
    const recovery = readFileSync("supabase/templates/recovery.html", "utf8");
    expect(confirmation).toContain("token_hash={{ .TokenHash }}");
    expect(confirmation).toContain("type=email");
    expect(confirmation).toContain("next=/my-library");
    expect(recovery).toContain("token_hash={{ .TokenHash }}");
    expect(recovery).toContain("type=recovery");
    expect(recovery).toContain("next=/reset-password");
  });

  it("ผูก recovery template และ fragment fallback ไปหน้าตั้งรหัสผ่าน", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const forgotRoute = readFileSync("app/api/auth/forgot/route.ts", "utf8");
    expect(config).toContain("[auth.email.template.recovery]");
    expect(config).toContain('content_path = "./supabase/templates/recovery.html"');
    expect(forgotRoute).toContain("/auth/email-callback?next=/reset-password");
  });

  it("อัปเดตรหัสผ่านผ่าน Supabase session แล้วจบ recovery session", () => {
    const resetRoute = readFileSync("app/api/auth/reset-password/route.ts", "utf8");
    expect(resetRoute).toContain("client.auth.getUser()");
    expect(resetRoute).toContain("client.auth.updateUser");
    expect(resetRoute).toContain('signOut({ scope: "local" })');
    expect(resetRoute).toContain("isSameOriginMutation");
    expect(resetRoute).toContain('"reset-password", 5, 900');
  });
});
