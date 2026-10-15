import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import readline from "node:readline";
import { createServerClient } from "@supabase/ssr";

const ref = "yexpgohajbptpkexlyet";
const supabaseUrl = `https://${ref}.supabase.co`;
const appUrl = "https://krupo-media-marketplace.krupo-media-marketplace.workers.dev";
const cli = spawnSync("pnpm", ["exec", "supabase", "projects", "api-keys", "--project-ref", ref, "--reveal", "-o", "json"], { encoding: "utf8" });
if (cli.status !== 0) throw new Error("อ่าน Supabase Staging key ไม่สำเร็จ");
const keys = JSON.parse(cli.stdout);
const service = keys.find((item) => item.name === "service_role")?.api_key;
const anon = keys.find((item) => item.name === "anon")?.api_key;
if (!service || !anon) throw new Error("ไม่พบ Supabase API key สำหรับ Staging");
const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };

const paid = await fetch(`${supabaseUrl}/rest/v1/media_items?select=id,slug,price_satang&status=eq.published&access_type=eq.paid&order=price_satang.asc`, { headers });
if (!paid.ok) throw new Error("อ่าน paid media ไม่สำเร็จ");
const media = await paid.json();
const m500 = media.find((m) => m.price_satang === 500);
const m1000 = media.find((m) => m.price_satang === 1000);
if (!m500 || !m1000) throw new Error("ไม่พบสื่อ Staging ราคา 5 และ 10 บาท");
const mediaIds = [m500.id, m1000.id];

const jar = new Map();
const roleRowsResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=user_id&role=eq.owner&revoked_at=is.null`, { headers });
if (!roleRowsResponse.ok) throw new Error("อ่าน Staging owner ไม่สำเร็จ");
const roleRows = await roleRowsResponse.json();
let ownerId = null;
let owner = null;
for (const row of roleRows) {
  const active = await fetch(`${supabaseUrl}/rest/v1/entitlements?select=id&user_id=eq.${row.user_id}&media_id=in.(${mediaIds.join(",")})&revoked_at=is.null`, { headers }).then((r) => r.json());
  if (active.length !== 0) continue;
  const candidateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${row.user_id}`, { headers });
  if (!candidateResponse.ok) continue;
  const candidate = await candidateResponse.json();
  if (String(candidate.email ?? "").toLowerCase().endsWith("@gmail.com")) { ownerId = row.user_id; owner = candidate; break; }
}
if (!ownerId) throw new Error("ไม่มี Staging owner ที่พร้อมสำหรับรายการทดสอบนี้");
const linkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, { method: "POST", headers, body: JSON.stringify({ type: "magiclink", email: owner.email }) });
if (!linkResponse.ok) throw new Error(`สร้าง one-time Staging session ไม่สำเร็จ (${linkResponse.status})`);
const link = await linkResponse.json();
const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, { method: "POST", headers: { apikey: anon, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });
if (!verifyResponse.ok) throw new Error(`ยืนยัน one-time Staging session ไม่สำเร็จ (${verifyResponse.status})`);
const session = await verifyResponse.json();
const authClient = createServerClient(supabaseUrl, anon, { cookies: { getAll: () => [], setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)) } });
const setSession = await authClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
if (setSession.error) throw new Error("สร้าง Hosted Staging cookie ไม่สำเร็จ");
function cookie() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "); }
if (!cookie()) throw new Error("ไม่พบ Hosted Staging auth cookie");

async function appPost(path, body) {
  const response = await fetch(`${appUrl}${path}`, { method: "POST", headers: { Origin: appUrl, Cookie: cookie(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ไม่สำเร็จ (${response.status}:${payload.error ?? "unknown"})`);
  return { status: response.status, payload };
}
for (const mediaId of mediaIds) await appPost("/api/cart", { mediaId });
const orders = [];
for (let i = 0; i < 2; i++) {
  const result = await appPost("/api/orders", { mediaIds, checkoutKey: randomUUID() });
  orders.push({ orderId: result.payload.orderId, paymentIntentId: result.payload.payment?.providerPaymentId, totalSatang: result.payload.totalSatang });
}
console.log(JSON.stringify({ ready: true, testUserId: ownerId, orders }));

async function refund(index) {
  const order = orders[index];
  const result = await appPost(`/api/admin/orders/${order.orderId}/refund`, { reason: `Hosted Stripe asynchronous refund E2E ${index + 1}` });
  console.log(JSON.stringify({ action: `refund${index + 1}`, httpStatus: result.status, providerStatus: result.payload.providerStatus ?? null, ok: result.payload.ok === true }));
}
async function read(path) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
  if (!response.ok) throw new Error(`Supabase verify ไม่สำเร็จ (${response.status})`);
  return response.json();
}
async function check() {
  const results = [];
  for (const order of orders) {
    const [orderRows, payments, refunds, entitlements, webhookEvents, items] = await Promise.all([
      read(`orders?select=id,status,total_satang&id=eq.${order.orderId}`),
      read(`payments?select=id,status,provider_payment_id&order_id=eq.${order.orderId}`),
      read(`refunds?select=id,status,provider_refund_id,provider_failure_reason&order_id=eq.${order.orderId}`),
      read(`entitlements?select=id,revoked_at&order_id=eq.${order.orderId}`),
      read(`payment_webhook_events?select=event_id,event_type,processing_status,error_code&order_id=eq.${order.orderId}&order=created_at.asc`),
      read(`order_items?select=id&order_id=eq.${order.orderId}`),
    ]);
    const itemIds = items.map((x) => x.id);
    const ledger = itemIds.length ? await read(`financial_ledger_entries?select=id,kind,amount_satang,reverses_entry_id,reference_id&reference_id=in.(${itemIds.join(",")})`) : [];
    const reversalCounts = new Map();
    for (const row of ledger) if (row.reverses_entry_id) reversalCounts.set(row.reverses_entry_id, (reversalCounts.get(row.reverses_entry_id) ?? 0) + 1);
    results.push({ orderId: order.orderId, orderStatus: orderRows[0]?.status ?? null, paymentStatus: payments[0]?.status ?? null, refundStatus: refunds[0]?.status ?? null, refundFailureRecorded: Boolean(refunds[0]?.provider_failure_reason), entitlementsActive: entitlements.filter((x) => !x.revoked_at).length, entitlementsRevoked: entitlements.filter((x) => x.revoked_at).length, ledgerNetSatang: ledger.reduce((sum, x) => sum + x.amount_satang, 0), duplicateReversals: [...reversalCounts.values()].filter((n) => n > 1).length, webhookEvents: webhookEvents.map((x) => ({ type: x.event_type, status: x.processing_status, error: x.error_code })) });
  }
  const jobs = await read("background_job_runs?select=job_name,status,metrics,finished_at&job_name=eq.refund_reconciliation&order=created_at.desc&limit=3");
  console.log(JSON.stringify({ action: "check", results, reconciliationRuns: jobs }));
}
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", async (line) => {
  try {
    const command = line.trim();
    if (command === "refund1") await refund(0);
    else if (command === "refund2") await refund(1);
    else if (command === "check") await check();
    else if (command === "exit") process.exit(0);
  } catch (error) { console.log(JSON.stringify({ error: error instanceof Error ? error.message : "unknown" })); }
});
