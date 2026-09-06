import { describe, expect, it, vi } from "vitest";
import { probeSupabaseHealth } from "@/server/supabase/health";

describe("Supabase runtime health", () => {
  it("ไม่อ้างว่า healthy เมื่อ credential ยังไม่ครบ", async () => {
    const result = await probeSupabaseHealth({ configured: () => false });
    expect(result.database).toEqual({ status: "unknown", reason: "missing_configuration" });
    expect(result.auth).toEqual({ status: "unknown", reason: "missing_configuration" });
  });

  it("รายงาน healthy หลังยิง Database และ Auth สำเร็จจริง", async () => {
    const checkDatabase = vi.fn(async () => undefined);
    const checkAuth = vi.fn(async () => undefined);
    const result = await probeSupabaseHealth({ configured: () => true, checkDatabase, checkAuth });
    expect(result).toEqual({ database: { status: "healthy" }, auth: { status: "healthy" } });
    expect(checkDatabase).toHaveBeenCalledOnce();
    expect(checkAuth).toHaveBeenCalledOnce();
  });

  it("แยก failure ของ Database และ Auth โดยไม่เปิดเผย error", async () => {
    const result = await probeSupabaseHealth({
      configured: () => true,
      checkDatabase: async () => { throw new Error("sensitive database detail"); },
      checkAuth: async () => undefined,
    });
    expect(result.database).toEqual({ status: "critical", reason: "probe_failed" });
    expect(result.auth).toEqual({ status: "healthy" });
    expect(JSON.stringify(result)).not.toContain("sensitive database detail");
  });

  it("หยุดรอ probe ที่ค้างตาม timeout", async () => {
    const never = () => new Promise<void>(() => undefined);
    const result = await probeSupabaseHealth({ configured: () => true, checkDatabase: never, checkAuth: never, timeoutMs: 5 });
    expect(result.database).toEqual({ status: "critical", reason: "timeout" });
    expect(result.auth).toEqual({ status: "critical", reason: "timeout" });
  });
});
