import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202609090010_async_refund_reconciliation.sql", "utf8");
const webhook = readFileSync("app/api/payments/webhook/route.ts", "utf8");
const refundRoute = readFileSync("app/api/admin/orders/[orderId]/refund/route.ts", "utf8");
const jobs = readFileSync("server/jobs/run-background-jobs.ts", "utf8");

describe("asynchronous refund reconciliation", () => {
  it("บันทึก processing ก่อนและ finalize ผ่าน verified provider status", () => {
    expect(refundRoute).toContain("record_provider_refund_request");
    expect(refundRoute).not.toContain('db.rpc("create_full_refund"');
    expect(migration).toMatch(/insert into public\.refunds[\s\S]+?'processing'/i);
    expect(migration).toContain("apply_refund_provider_status");
  });

  it("รองรับ refund.updated/refund.failed และป้องกัน webhook ซ้ำ", () => {
    expect(webhook).toContain("process_verified_refund_event");
    expect(migration).toMatch(/p_event_type not in \('refund\.updated','refund\.failed'\)/);
    expect(migration).toMatch(/on conflict\(provider,event_id\) do nothing/i);
    expect(migration).toContain("ignored_terminal_failure");
  });

  it("reversal อ้างรายการเดิมและ reconciliation ไม่สร้างรายการซ้ำ", () => {
    expect(migration).toMatch(/not exists\(select 1 from public\.financial_ledger_entries r where r\.reverses_entry_id=l\.id\)/i);
    expect(migration).toContain("reconcile_provider_refund");
    expect(jobs).toContain("runRefundReconciliationJob");
    expect(jobs).toMatch(/\.eq\("status","processing"\)[\s\S]+?\.limit\(100\)/);
  });
});
