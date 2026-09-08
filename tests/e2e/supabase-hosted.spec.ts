import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const requiredNames = [
  "PLAYWRIGHT_BASE_URL",
  "SUPABASE_E2E_USER_EMAIL",
  "SUPABASE_E2E_USER_PASSWORD",
  "SUPABASE_E2E_OWNER_EMAIL",
  "SUPABASE_E2E_OWNER_PASSWORD",
  "SUPABASE_E2E_ADMIN_EMAIL",
  "SUPABASE_E2E_ADMIN_PASSWORD",
  "SUPABASE_E2E_CREATOR_EMAIL",
  "SUPABASE_E2E_CREATOR_PASSWORD",
] as const;
const enabled = requiredNames.every((name) => Boolean(process.env[name]));

async function login(page: Page, emailName: string, passwordName: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(process.env[emailName] ?? "");
  await page.getByLabel("รหัสผ่าน").fill(process.env[passwordName] ?? "");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replaceAll("/", "\\/")}$`));
}

test.describe.serial("Supabase Auth บน Hosted Staging", () => {
  test.skip(!enabled, "ต้องใช้ Hosted URL และบัญชีทดสอบที่เก็บใน secret environment เท่านั้น");

  test("User login, session, protected route, server role และ logout", async ({ page }) => {
    await login(page, "SUPABASE_E2E_USER_EMAIL", "SUPABASE_E2E_USER_PASSWORD", "/my-library");
    await expect(page.getByRole("heading", { name: /สวัสดี,/ })).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/unauthorized$/);
    await expect(page.getByRole("heading", { name: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้" })).toBeVisible();

    await page.goto("/creator/media/new");
    await expect(page).toHaveURL(/\/unauthorized$/);

    await page.goto("/account");
    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/my-library");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-library/);
  });

  test("Signup link ต้องยืนยันอีเมลผ่าน callback ก่อนสร้าง session", async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!url || !serverKey, "ต้องใช้ Supabase server secret ใน process ของ E2E เท่านั้น");
    const admin = createClient(url!, serverKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = `krupo.staging.signup+${Date.now()}-${crypto.randomUUID()}@gmail.com`;
    const password = `Kp!${crypto.randomUUID()}9a`;
    let userId: string | undefined;
    try {
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo: `${process.env.PLAYWRIGHT_BASE_URL}/auth/email-callback?next=/my-library`,
          data: { display_name: "สมาชิกยืนยันอีเมล", staging_test_account: true },
        },
      });
      if (linkError || !link.user || !link.properties) throw new Error("Supabase ไม่สามารถสร้างลิงก์ยืนยันสำหรับ Hosted E2E");
      expect(link.user.email_confirmed_at).toBeFalsy();
      userId = link.user.id;
      const { data: profile } = await admin.from("profiles").select("id").eq("id", userId!).single();
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId!).eq("role", "user").single();
      expect(profile?.id).toBe(userId);
      expect(role?.role).toBe("user");

      await loginWithValues(page, email, password, "/login?error=invalid_credentials", true);
      await page.goto(link.properties.action_link);
      await expect
        .poll(() => new URL(page.url()).pathname, {
          message: "Email callback ต้องสร้าง session และนำผู้ใช้ไปยัง My Library",
        })
        .toBe("/my-library");
      await expect(page.getByRole("heading", { name: /สวัสดี,/ })).toBeVisible();
      const { data: confirmed } = await admin.auth.admin.getUserById(userId!);
      expect(confirmed.user?.email_confirmed_at).toBeTruthy();
    } finally {
      if (userId) await admin.auth.admin.deleteUser(userId);
    }
  });

  test("Recovery link สร้าง session ตั้งรหัสผ่านใหม่ และบังคับ login ใหม่", async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!url || !serverKey, "ต้องใช้ Supabase server secret ใน process ของ E2E เท่านั้น");
    const admin = createClient(url!, serverKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = `krupo.staging.recovery+${Date.now()}-${crypto.randomUUID()}@gmail.com`;
    const oldPassword = `Old!${crypto.randomUUID()}9a`;
    const newPassword = `New!${crypto.randomUUID()}8b`;
    let userId: string | undefined;
    try {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: oldPassword,
        email_confirm: true,
        user_metadata: { display_name: "สมาชิกทดสอบ Recovery", staging_test_account: true },
      });
      if (createError || !created.user) throw new Error("Supabase ไม่สามารถสร้างบัญชีทดสอบ recovery");
      userId = created.user.id;

      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${process.env.PLAYWRIGHT_BASE_URL}/auth/email-callback?next=/reset-password`,
        },
      });
      if (linkError || !link.properties) throw new Error("Supabase ไม่สามารถสร้างลิงก์ recovery สำหรับ Hosted E2E");

      await page.goto(link.properties.action_link);
      await expect.poll(() => new URL(page.url()).pathname).toBe("/reset-password");
      await expect(page.getByRole("heading", { name: "ตั้งรหัสผ่านใหม่" })).toBeVisible();
      await page.getByLabel("รหัสผ่านใหม่", { exact: true }).fill(newPassword);
      await page.getByLabel("ยืนยันรหัสผ่านใหม่").fill(newPassword);
      await page.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }).click();
      await expect(page).toHaveURL(/\/login\?message=password_updated$/);
      await expect(page.getByText("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง")).toBeVisible();

      await loginWithValues(page, email, oldPassword, "/login?error=invalid_credentials", true);
      await loginWithValues(page, email, newPassword, "/my-library");
      await expect(page.getByRole("heading", { name: /สวัสดี,/ })).toBeVisible();
    } finally {
      if (userId) await admin.auth.admin.deleteUser(userId);
    }
  });

  test("Owner bootstrap และ role authorization มาจาก Server", async ({ page }) => {
    await login(page, "SUPABASE_E2E_OWNER_EMAIL", "SUPABASE_E2E_OWNER_PASSWORD", "/admin");
    await expect(page.getByRole("heading", { name: "แดชบอร์ดผู้ดูแลระบบ" })).toBeVisible();
    await page.goto("/admin/reviews");
    await expect(page.getByRole("heading", { name: "สื่อรอตรวจ" })).toBeVisible();
    await page.goto("/admin/links");
    await expect(page.getByRole("heading", { name: "ตรวจลิงก์" })).toBeVisible();
  });

  test("Admin และ Creator ใช้ role ที่อ่านจากฐานข้อมูลฝั่ง Server", async ({ page }) => {
    await login(page, "SUPABASE_E2E_ADMIN_EMAIL", "SUPABASE_E2E_ADMIN_PASSWORD", "/admin");
    await expect(page.getByRole("heading", { name: "แดชบอร์ดผู้ดูแลระบบ" })).toBeVisible();
    await expect(page.getByText("ข้อมูลจากฐานข้อมูล")).toBeVisible();
    await page.goto("/account");
    await page.getByRole("button", { name: "ออกจากระบบ" }).click();

    await login(page, "SUPABASE_E2E_CREATOR_EMAIL", "SUPABASE_E2E_CREATOR_PASSWORD", "/creator/media/new");
    await page.goto("/creator/media/new");
    await expect(page.getByRole("heading", { name: "เพิ่มสื่อใหม่" })).toBeVisible();
  });

  test("Health ยืนยัน Database/Auth จริงและ provider ที่ยังปิด", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("operational");
    expect(body.checks.database.status).toBe("healthy");
    expect(body.checks.auth.status).toBe("healthy");
    expect(body.checks.payment.provider).toBe("disabled");
    expect(body.checks.storage.provider).toBe(process.env.PLAYWRIGHT_EXPECT_STORAGE_PROVIDER ?? "local_test");
  });
});

async function loginWithValues(page: Page, email: string, password: string, expectedPath: string, expectFailure = false) {
  const next = expectFailure ? "/my-library" : expectedPath;
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(new URL(expectedPath, process.env.PLAYWRIGHT_BASE_URL).toString());
}
