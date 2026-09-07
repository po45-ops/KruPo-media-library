import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { GoogleDriveStorageProvider } from "../../providers/storage/google-drive-storage";

const requiredNames = [
  "PLAYWRIGHT_BASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_E2E_USER_EMAIL",
  "SUPABASE_E2E_USER_PASSWORD",
  "SUPABASE_E2E_ADMIN_EMAIL",
  "SUPABASE_E2E_ADMIN_PASSWORD",
  "SUPABASE_E2E_CREATOR_EMAIL",
  "SUPABASE_E2E_CREATOR_PASSWORD",
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REFRESH_TOKEN",
  "GOOGLE_DRIVE_ROOT_FOLDER_ID",
] as const;

const enabled = requiredNames.every((name) => Boolean(process.env[name]));

function required(name: typeof requiredNames[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

async function login(page: Page, email: string, password: string, next: string) {
  await page.context().clearCookies();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replaceAll("/", "\\/")}$`));
}

async function sameOriginPost(page: Page, path: string, body: Record<string, unknown>) {
  return page.evaluate(async ({ path: target, body: payload }) => {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: response.status, text: await response.text() };
  }, { path, body });
}

test.describe.serial("Google Drive Hosted Staging", () => {
  test.skip(!enabled, "ต้องใช้ Hosted/Supabase/Google Drive staging credentials จาก environment เท่านั้น");
  test.setTimeout(180_000);

  test("upload → review → entitlement → authorized download และ creator isolation", async ({ page }) => {
    const baseUrl = required("PLAYWRIGHT_BASE_URL");
    const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
    const creatorEmail = required("SUPABASE_E2E_CREATOR_EMAIL");
    const creatorPassword = required("SUPABASE_E2E_CREATOR_PASSWORD");
    const adminEmail = required("SUPABASE_E2E_ADMIN_EMAIL");
    const adminPassword = required("SUPABASE_E2E_ADMIN_PASSWORD");
    const userEmail = required("SUPABASE_E2E_USER_EMAIL");
    const userPassword = required("SUPABASE_E2E_USER_PASSWORD");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const storage = new GoogleDriveStorageProvider({
      clientId: required("GOOGLE_DRIVE_CLIENT_ID"),
      clientSecret: required("GOOGLE_DRIVE_CLIENT_SECRET"),
      refreshToken: required("GOOGLE_DRIVE_REFRESH_TOKEN"),
      rootFolderId: required("GOOGLE_DRIVE_ROOT_FOLDER_ID"),
    });
    const marker = crypto.randomUUID();
    const bytes = Buffer.from(`%PDF-1.4\n% KruPo Hosted Staging ${marker}\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n`);
    const expectedChecksum = createHash("sha256").update(bytes).digest("hex");
    let mediaId: string | undefined;
    let mediaFileId: string | undefined;
    let storageFileId: string | undefined;
    let entitlementId: string | undefined;

    try {
      const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
      if (usersError) throw usersError;
      const userId = authUsers.users.find((user) => user.email?.toLowerCase() === userEmail.toLowerCase())?.id;
      const adminId = authUsers.users.find((user) => user.email?.toLowerCase() === adminEmail.toLowerCase())?.id;
      if (!userId || !adminId) throw new Error("ไม่พบบัญชี User/Admin สำหรับ Hosted E2E");

      await login(page, creatorEmail, creatorPassword, "/creator/media/new");
      await page.getByLabel("ชื่อสื่อ").fill(`Drive E2E ${marker.slice(0, 8)}`);
      await page.getByLabel("รายละเอียด").fill("ไฟล์ทดสอบ Google Drive Hosted Staging สำหรับตรวจสิทธิ์ดาวน์โหลดแบบครบวงจร");
      await page.getByLabel("วิชา").selectOption({ label: "คณิตศาสตร์" });
      await page.getByLabel("ระดับชั้น").selectOption({ label: "ประถมศึกษาปีที่ 4" });
      await page.getByLabel("ประเภท").selectOption({ label: "ใบงาน" });
      await page.getByLabel("ราคา (บาท)").fill("10");
      await page.locator('input[name="mediaFile"]').setInputFiles({
        name: `krupo-drive-e2e-${marker}.pdf`,
        mimeType: "application/pdf",
        buffer: bytes,
      });
      await page.getByLabel("Ownership Evidence").fill("สร้างขึ้นสำหรับทดสอบ Hosted Staging โดยเจ้าของระบบ KruPo เท่านั้น");
      await page.getByLabel("ฉันยืนยันว่าเป็นเจ้าของหรือมีสิทธิ์เพียงพอ").check();
      const [submissionResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().endsWith("/api/creator/submissions") && response.request().method() === "POST"),
        page.getByRole("button", { name: "ส่งเข้าตรวจสอบ" }).click(),
      ]);
      expect(submissionResponse.status()).toBe(201);
      const submission = await submissionResponse.json() as { mediaId?: string; status?: string };
      expect(submission.status).toBe("human_review");
      if (!submission.mediaId) throw new Error("submission ไม่มี mediaId");
      mediaId = submission.mediaId;

      const { data: file, error: fileError } = await admin
        .from("media_files")
        .select("id,storage_provider,storage_file_id,storage_path,checksum,area,malware_status")
        .eq("media_id", mediaId)
        .eq("purpose", "source")
        .single();
      if (fileError || !file) throw fileError ?? new Error("ไม่พบ media file");
      mediaFileId = file.id;
      storageFileId = file.storage_file_id;
      const uploadedStorageFileId = file.storage_file_id;
      expect(file).toMatchObject({ storage_provider: "google_drive", area: "temporary_review", malware_status: "manual_review", checksum: expectedChecksum });
      expect(await storage.exists(uploadedStorageFileId)).toBe(true);

      const creatorCannotApprove = await sameOriginPost(page, `/api/admin/media/${mediaId}/file-safety`, {
        fileId: mediaFileId,
        status: "clean",
        reason: "Creator ต้องไม่มีสิทธิ์อนุมัติไฟล์ของตนเอง",
      });
      expect(creatorCannotApprove.status).toBe(403);

      const creatorDb = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: creatorLoginError } = await creatorDb.auth.signInWithPassword({ email: creatorEmail, password: creatorPassword });
      if (creatorLoginError) throw creatorLoginError;
      const { data: exposedFiles, error: isolationError } = await creatorDb.from("media_files").select("id").eq("media_id", mediaId);
      expect(Boolean(isolationError) || (exposedFiles?.length ?? 0) === 0).toBe(true);

      await login(page, adminEmail, adminPassword, "/admin/reviews");
      const safety = await sameOriginPost(page, `/api/admin/media/${mediaId}/file-safety`, {
        fileId: mediaFileId,
        status: "clean",
        reason: "ตรวจไฟล์ Staging แล้ว ไม่พบ active content",
      });
      expect(safety.status, safety.text).toBe(200);
      const approval = await sameOriginPost(page, `/api/admin/media/${mediaId}/approve`, {
        reason: "อนุมัติสำหรับ Hosted Google Drive E2E",
      });
      expect(approval.status, approval.text).toBe(200);

      const { data: approvedFile, error: approvedFileError } = await admin
        .from("media_files")
        .select("area,malware_status,storage_path")
        .eq("id", mediaFileId)
        .single();
      if (approvedFileError) throw approvedFileError;
      expect(approvedFile).toMatchObject({ area: "permanent", malware_status: "clean" });
      expect(approvedFile.storage_path).toContain(`/media/${mediaId}/`);

      await login(page, userEmail, userPassword, "/my-library");
      const locked = await page.evaluate(async (target) => (await fetch(target, { cache: "no-store" })).status, `/api/media/${mediaId}/download`);
      expect(locked).toBe(403);

      const { data: entitlement, error: entitlementError } = await admin
        .from("entitlements")
        .insert({ user_id: userId, media_id: mediaId, source: "admin_grant", granted_by: adminId })
        .select("id")
        .single();
      if (entitlementError || !entitlement) throw entitlementError ?? new Error("สร้าง entitlement ไม่สำเร็จ");
      entitlementId = entitlement.id;

      const download = await page.evaluate(async (target) => {
        const response = await fetch(target, { cache: "no-store" });
        const payload = await response.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", payload);
        const checksum = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        return { status: response.status, checksum, cacheControl: response.headers.get("cache-control") };
      }, `/api/media/${mediaId}/download`);
      expect(download.status).toBe(200);
      expect(download.checksum).toBe(expectedChecksum);
      expect(download.cacheControl).toContain("no-store");

      const { count: logCount, error: logError } = await admin
        .from("download_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("media_id", mediaId)
        .eq("media_file_id", mediaFileId);
      if (logError) throw logError;
      expect(logCount).toBeGreaterThanOrEqual(1);
      expect(new URL(baseUrl).protocol).toBe("https:");
    } finally {
      if (entitlementId) await admin.from("entitlements").update({ revoked_at: new Date().toISOString(), revoke_reason: "Hosted Staging E2E cleanup" }).eq("id", entitlementId);
      if (mediaId) await admin.from("media_items").update({ status: "archived" }).eq("id", mediaId);
      if (mediaFileId) await admin.from("media_files").update({ active: false, retention_until: new Date().toISOString() }).eq("id", mediaFileId);
      if (storageFileId && await storage.exists(storageFileId).catch(() => false)) await storage.delete(storageFileId);
    }
  });
});
