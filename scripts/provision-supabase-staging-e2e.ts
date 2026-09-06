import { createClient } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`ยังไม่ได้ตั้งค่า ${name}`);
  return value;
}

async function main() {
  if (process.env.APP_ENV !== "staging") throw new Error("คำสั่งนี้อนุญาตเฉพาะ APP_ENV=staging");

  const admin = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const accounts = [
    { kind: "user_a", email: required("SUPABASE_RLS_USER_A_EMAIL"), password: required("SUPABASE_RLS_USER_A_PASSWORD"), displayName: "ผู้ใช้ทดสอบ ก" },
    { kind: "user_b", email: required("SUPABASE_RLS_USER_B_EMAIL"), password: required("SUPABASE_RLS_USER_B_PASSWORD"), displayName: "ผู้ใช้ทดสอบ ข" },
    { kind: "owner", email: required("SUPABASE_E2E_OWNER_EMAIL"), password: required("SUPABASE_E2E_OWNER_PASSWORD"), displayName: "เจ้าของระบบทดสอบ" },
    { kind: "admin", email: required("SUPABASE_E2E_ADMIN_EMAIL"), password: required("SUPABASE_E2E_ADMIN_PASSWORD"), displayName: "ผู้ดูแลระบบทดสอบ" },
    { kind: "creator", email: required("SUPABASE_E2E_CREATOR_EMAIL"), password: required("SUPABASE_E2E_CREATOR_PASSWORD"), displayName: "ผู้สร้างสื่อทดสอบ" },
  ] as const;

  const users = new Map<string, string>();
  const { data: existingUsers, error: listUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (listUsersError) throw new Error(`อ่านบัญชี Staging ไม่สำเร็จ: ${listUsersError.status ?? "unknown"}`);

  for (const account of accounts) {
    const existing = existingUsers.users.find((user) => user.email?.toLocaleLowerCase() === account.email.toLocaleLowerCase());
    if (existing) {
      const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: { ...existing.user_metadata, display_name: account.displayName, staging_test_account: true },
      });
      if (error || !data.user) throw new Error(`อัปเดตบัญชี ${account.kind} ไม่สำเร็จ: ${error?.status ?? "unknown"}`);
      users.set(account.kind, data.user.id);
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.displayName, staging_test_account: true },
    });
    if (error || !data.user) throw new Error(`สร้างบัญชี ${account.kind} ไม่สำเร็จ: ${error?.status ?? "unknown"}`);
    users.set(account.kind, data.user.id);
  }

  const adminId = requiredMap(users, "admin");
  const creatorId = requiredMap(users, "creator");
  const ownerId = requiredMap(users, "owner");
  const { error: roleError } = await admin.from("user_roles").upsert([
    { user_id: adminId, role: "admin", granted_by: adminId },
    { user_id: creatorId, role: "creator", granted_by: adminId },
  ]);
  if (roleError) throw new Error(`กำหนด role ทดสอบไม่สำเร็จ: ${roleError.code}`);

  const { error: creatorError } = await admin.from("creator_profiles").upsert({
    user_id: creatorId,
    display_name: "ผู้สร้างสื่อทดสอบ",
    legal_name: "Staging Test Creator",
    creator_type: "teacher",
    bio: "บัญชีอัตโนมัติสำหรับ Hosted Staging E2E",
    contact_channels: {},
    trust_level: "new",
    status: "approved",
    seller_agreement_version: "staging-e2e",
    seller_agreement_accepted_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
  });
  if (creatorError) throw new Error(`สร้าง creator profile ทดสอบไม่สำเร็จ: ${creatorError.code}`);

  const [{ data: subjects, error: subjectsError }, { data: mediaTypes, error: mediaTypesError }, { data: gradeLevels, error: gradesError }] = await Promise.all([
    admin.from("subjects").select("id,slug").in("slug", ["math", "english", "science"]),
    admin.from("media_types").select("id,slug").in("slug", ["game", "worksheet"]),
    admin.from("grade_levels").select("id,slug").in("slug", ["p3", "p4"]),
  ]);
  if (subjectsError || mediaTypesError || gradesError) throw new Error("อ่าน lookup สำหรับข้อมูล Staging ไม่สำเร็จ");
  const subjectIds = new Map(subjects.map((row) => [row.slug, row.id]));
  const mediaTypeIds = new Map(mediaTypes.map((row) => [row.slug, row.id]));
  const gradeIds = new Map(gradeLevels.map((row) => [row.slug, row.id]));
  const publishedAt = new Date().toISOString();
  const stagingMedia = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "quick-math-p4",
      title_th: "คณิตคิดไว ป.4",
      short_description_th: "เกมฝึกคิดเลขเร็วสำหรับ Hosted Staging QA",
      description_th: "ข้อมูลทดสอบเฉพาะ Staging สำหรับตรวจ Paid media locked และหน้ารายละเอียด",
      subject_id: requiredLookup(subjectIds, "math"),
      media_type_id: requiredLookup(mediaTypeIds, "game"),
      creator_id: creatorId,
      access_type: "paid",
      delivery_type: "external_link",
      price_satang: 500,
      status: "published",
      protection_status: "verified_external",
      tags: ["staging-e2e", "ป.4"],
      rating_average: 4.9,
      rating_count: 12,
      sales_count: 0,
      published_at: publishedAt,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      slug: "word-mission",
      title_th: "ภารกิจคำศัพท์",
      short_description_th: "เกมคำศัพท์ภาษาอังกฤษสำหรับ Hosted Staging QA",
      description_th: "ข้อมูลทดสอบเฉพาะ Staging สำหรับตรวจ Free media และ Catalog มือถือ",
      subject_id: requiredLookup(subjectIds, "english"),
      media_type_id: requiredLookup(mediaTypeIds, "game"),
      creator_id: creatorId,
      access_type: "free",
      delivery_type: "external_link",
      price_satang: 0,
      status: "published",
      protection_status: "external_only",
      tags: ["staging-e2e", "ภาษาอังกฤษ"],
      rating_average: 4.8,
      rating_count: 9,
      sales_count: 0,
      published_at: publishedAt,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      slug: "solar-system",
      title_th: "ระบบสุริยะ",
      short_description_th: "ใบงานวิทยาศาสตร์สำหรับ Hosted Staging QA",
      description_th: "ข้อมูลทดสอบเฉพาะ Staging สำหรับตรวจการค้นหาและหน้ารายละเอียด",
      subject_id: requiredLookup(subjectIds, "science"),
      media_type_id: requiredLookup(mediaTypeIds, "worksheet"),
      creator_id: creatorId,
      access_type: "free",
      delivery_type: "file",
      price_satang: 0,
      status: "published",
      protection_status: "krupo_protected",
      tags: ["staging-e2e", "ระบบสุริยะ"],
      rating_average: 4.9,
      rating_count: 15,
      sales_count: 0,
      published_at: publishedAt,
    },
  ] as const;
  const { data: mediaRows, error: mediaError } = await admin
    .from("media_items")
    .upsert(stagingMedia, { onConflict: "slug" })
    .select("id,slug");
  if (mediaError || !mediaRows) throw new Error(`สร้างข้อมูลสื่อ Staging ไม่สำเร็จ: ${mediaError?.code ?? "no_data"}`);

  const gradeBySlug = new Map([[
    "quick-math-p4", requiredLookup(gradeIds, "p4"),
  ], [
    "word-mission", requiredLookup(gradeIds, "p3"),
  ], [
    "solar-system", requiredLookup(gradeIds, "p4"),
  ]]);
  const { error: mediaGradesError } = await admin.from("media_grade_levels").upsert(
    mediaRows.map((row) => ({ media_id: row.id, grade_level_id: requiredLookup(gradeBySlug, row.slug) })),
  );
  if (mediaGradesError) throw new Error(`กำหนดระดับชั้นสื่อ Staging ไม่สำเร็จ: ${mediaGradesError.code}`);

  const { data: bootstrapped, error: bootstrapError } = await admin.rpc("bootstrap_owner_role", {
    p_user_id: ownerId,
    p_expected_email: required("SUPABASE_E2E_OWNER_EMAIL"),
  });
  if (bootstrapError) throw new Error(`Owner bootstrap ไม่สำเร็จ: ${bootstrapError.code}`);
  const { count: ownerRoleCount, error: ownerRoleError } = await admin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", ownerId)
    .eq("role", "owner")
    .is("revoked_at", null);
  if (ownerRoleError || ownerRoleCount !== 1) throw new Error(`ไม่พบ Owner role หลัง bootstrap: ${ownerRoleError?.code ?? "invalid_count"}`);

  const { count, error: auditError } = await admin
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", ownerId)
    .eq("action", "bootstrap_owner");
  if (auditError || !count || count < 1) throw new Error(`ไม่พบ Owner bootstrap audit: ${auditError?.code ?? "invalid_count"}`);

  console.log(JSON.stringify({ accounts_ready: accounts.length, roles_ready: true, creator_ready: true, staging_media_ready: mediaRows.length, owner_bootstrap_inserted: bootstrapped === true, owner_bootstrap_audited: true }));
}

function requiredMap(values: Map<string, string>, key: string) {
  const value = values.get(key);
  if (!value) throw new Error(`ไม่พบ staging account ${key}`);
  return value;
}

function requiredLookup(values: Map<string, string>, key: string) {
  const value = values.get(key);
  if (!value) throw new Error(`ไม่พบ lookup ${key}`);
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "เตรียมบัญชี Hosted Staging ไม่สำเร็จ");
  process.exit(1);
});
