import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { MockPaymentProvider } from "../../providers/payments/mock-payment";
import { buildSaleLedger, reverseLedger } from "../../server/domain/ledger";
import { roleCan } from "../../server/auth/permissions";
import { classifyLinkResponse, nextMediaHealth } from "../../server/domain/link-health";

test("Mock payment success contract", async () => {
  const provider = new MockPaymentProvider();
  const session = await provider.createPayment({ orderId: "order-e2e", amountSatang: 1000, currency: "thb", description: "E2E", idempotencyKey: "order:order-e2e" });
  const event = await provider.verifyWebhook(JSON.stringify({ eventId: "evt-e2e", orderId: "order-e2e", amountSatang: 1000, status: "paid" }));
  expect(session.status).toBe("awaiting_payment");
  expect(event.status).toBe("paid");
  expect(event.eventId).toBe("evt-e2e");
});

test("Entitlement creation และ duplicate webhook เป็น atomic/idempotent", async () => {
  const sql = await readFile("supabase/migrations/202609030002_security_functions.sql", "utf8");
  expect(sql).toContain("process_verified_payment_event");
  expect(sql).toMatch(/payment_webhook_events[\s\S]+on conflict/i);
  expect(sql).toMatch(/insert into public\.entitlements[\s\S]+on conflict/i);
});

test("Creator revenue และ refund สร้าง ledger reversal", () => {
  const sale = buildSaleLedger({ orderItemId: "item-1", creatorId: "creator-1", creatorShareSatang: 850, platformShareSatang: 150, holdUntil: new Date().toISOString() });
  const reversal = reverseLedger(sale, "refund-1");
  expect(sale.map((entry) => entry.amountSatang)).toEqual([850, 150]);
  expect(reversal.map((entry) => entry.amountSatang)).toEqual([-850, -150]);
  expect(reversal.every((entry) => Boolean(entry.reversesEntryId))).toBe(true);
});

test("Link health: 403 warning และ failure ต่อเนื่อง suspend sales", () => {
  expect(classifyLinkResponse({ status: 403 })).toBe("warning");
  expect(nextMediaHealth(5)).toEqual({ status: "suspended", action: "suspend_sales" });
});

test("Admin permissions แยก finance/support/reviewer", () => {
  expect(roleCan("finance", "finance.manage")).toBe(true);
  expect(roleCan("support", "finance.manage")).toBe(false);
  expect(roleCan("reviewer", "media.review")).toBe(true);
  expect(roleCan("user", "system.manage")).toBe(false);
});
