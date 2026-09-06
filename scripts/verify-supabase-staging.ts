import { createClient } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`ยังไม่ได้ตั้งค่า ${name}`);
  return value;
}

async function main() {
  if (process.env.APP_ENV !== "staging") throw new Error("คำสั่งนี้อนุญาตเฉพาะ APP_ENV=staging");
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const secretKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: audit, error: auditError } = await admin.rpc("database_security_audit");
  if (auditError) throw new Error(`database_security_audit ไม่ผ่าน: ${auditError.code}`);
  const counts = audit as Record<string, number>;
  // Migration 006 intentionally removes the broad creator_profiles public policy
  // and replaces that exposure with the redacted creator_directory view.
  const exact = { tables: 54, rls_tables: 54, policies: 30, commented_tables: 54 };
  for (const [key, expected] of Object.entries(exact)) {
    if (counts[key] !== expected) throw new Error(`${key} ต้องเป็น ${expected} แต่พบ ${counts[key] ?? "unknown"}`);
  }
  if (counts.security_invoker_views !== 10) throw new Error("View ทุกตัวต้องใช้ security invoker");
  if (counts.client_executable_sensitive_functions !== 0) throw new Error("พบ SECURITY DEFINER helper ที่ client ยังเรียกได้");
  if ((counts.indexes ?? 0) < 24) throw new Error("จำนวน index ต่ำกว่าสัญญาความปลอดภัย/ประสิทธิภาพ");
  if ((counts.views ?? 0) < 10) throw new Error("Thai/admin views ไม่ครบ");

  const { error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (authError) throw new Error(`Auth admin probe ไม่ผ่าน: ${authError.status ?? "unknown"}`);

  const credentials = ["SUPABASE_RLS_USER_A_EMAIL", "SUPABASE_RLS_USER_A_PASSWORD", "SUPABASE_RLS_USER_B_EMAIL", "SUPABASE_RLS_USER_B_PASSWORD"];
  if (credentials.some((name) => !process.env[name])) {
    console.log("Supabase schema/Auth probe ผ่าน; ข้าม User A/B RLS เพราะยังไม่ได้ตั้ง test-account environment variables");
    console.log(JSON.stringify({ ...counts, auth: "healthy", rls_user_isolation: "not_run" }));
    return;
  }

  const userAClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const userBClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonymousClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [aLogin, bLogin] = await Promise.all([
    userAClient.auth.signInWithPassword({ email: required("SUPABASE_RLS_USER_A_EMAIL"), password: required("SUPABASE_RLS_USER_A_PASSWORD") }),
    userBClient.auth.signInWithPassword({ email: required("SUPABASE_RLS_USER_B_EMAIL"), password: required("SUPABASE_RLS_USER_B_PASSWORD") }),
  ]);
  if (aLogin.error || !aLogin.data.user || bLogin.error || !bLogin.data.user) throw new Error("เข้าสู่ระบบบัญชี RLS ทดสอบไม่สำเร็จ");

  const userAId = aLogin.data.user.id;
  const userBId = bLogin.data.user.id;
  if (userAId === userBId) throw new Error("บัญชี User A/B ต้องเป็นคนละบัญชี");
  const [ownProfile, otherProfile, otherRoles, otherOrders, otherEntitlements, otherCreatorEarnings, secureTargets] = await Promise.all([
    userAClient.from("profiles").select("id").eq("id", userAId),
    userAClient.from("profiles").select("id").eq("id", userBId),
    userAClient.from("user_roles").select("user_id,role").eq("user_id", userBId),
    userAClient.from("orders").select("id,user_id").eq("user_id", userBId),
    userAClient.from("entitlements").select("id,user_id").eq("user_id", userBId),
    userAClient.from("creator_earnings").select("id,creator_id").eq("creator_id", userBId),
    userAClient.from("media_secure_targets").select("id").limit(1),
  ]);
  const readableTables = [ownProfile, otherProfile, otherRoles, otherOrders, otherEntitlements, otherCreatorEarnings];
  if (readableTables.some((result) => result.error)) throw new Error("RLS query เกิดข้อผิดพลาดแทนการคืนข้อมูลที่อนุญาต");
  if (ownProfile.data?.length !== 1) throw new Error("User A อ่าน profile ของตนเองไม่ได้");
  if ([otherProfile, otherRoles, otherOrders, otherEntitlements, otherCreatorEarnings].some((result) => result.data?.length)) {
    throw new Error("RLS isolation ล้มเหลว: User A มองเห็นข้อมูล User B");
  }
  if (!secureTargets.error) throw new Error("secure target ต้องถูก revoke จาก authenticated client");

  const denyAllTables = [
    "admin_audit_logs", "ai_usage_events", "background_job_runs", "commission_rules", "copyright_claims",
    "copyright_decisions", "copyright_evidence", "creator_commission_overrides", "creator_strikes",
    "creator_trust_history", "creator_verifications", "download_logs", "feature_flags", "game_launch_logs",
    "health_check_results", "link_health_checks", "link_url_history", "media_files", "media_reports",
    "media_secure_targets", "media_versions", "media_view_logs", "payment_webhook_events", "payout_items",
    "platform_incidents", "refunds", "system_settings",
  ];
  for (const table of denyAllTables) {
    const [anonymous, authenticated, server] = await Promise.all([
      anonymousClient.from(table).select("*").limit(1),
      userAClient.from(table).select("*").limit(1),
      admin.from(table).select("*").limit(1),
    ]);
    if (!anonymous.error || !authenticated.error) throw new Error(`ตาราง ${table} ไม่เป็น client deny-all`);
    if (server.error) throw new Error(`service-role อ่านตาราง ${table} ไม่ได้: ${server.error.code}`);
  }

  const [anonymousDirectory, authenticatedDirectory, serverDirectory] = await Promise.all([
    anonymousClient.from("creator_directory").select("user_id").limit(1),
    userAClient.from("creator_directory").select("user_id").limit(1),
    admin.from("creator_directory").select("user_id").limit(1),
  ]);
  if (!anonymousDirectory.error || !authenticatedDirectory.error || serverDirectory.error) {
    throw new Error("creator_directory ต้องเปิดเฉพาะ server repository");
  }

  if (process.env.SUPABASE_E2E_OWNER_EMAIL) {
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const owner = users.users.find((user) => user.email?.toLocaleLowerCase() === process.env.SUPABASE_E2E_OWNER_EMAIL?.toLocaleLowerCase());
    if (usersError || !owner) throw new Error("ไม่พบบัญชี Owner สำหรับตรวจ bootstrap");
    const [ownerRole, bootstrapAudit] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", owner.id).eq("role", "owner").is("revoked_at", null),
      admin.from("admin_audit_logs").select("id").eq("actor_id", owner.id).eq("action", "bootstrap_owner"),
    ]);
    if (ownerRole.error || ownerRole.data?.length !== 1 || bootstrapAudit.error || bootstrapAudit.data?.length !== 1) {
      throw new Error("Owner bootstrap role/Audit Log ไม่ครบ");
    }
  }

  await Promise.all([userAClient.auth.signOut(), userBClient.auth.signOut()]);
  console.log(JSON.stringify({ ...counts, auth: "healthy", rls_user_isolation: "passed", intentional_deny_all: "passed", creator_directory: "server_only", owner_bootstrap: process.env.SUPABASE_E2E_OWNER_EMAIL ? "passed" : "not_run" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Supabase staging verification failed");
  process.exit(1);
});
