import { expect, test } from "@playwright/test";

test.describe("Hosted Staging smoke", () => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "รันเฉพาะเมื่อกำหนด Hosted Staging URL");

  test("public routes และ security headers", async ({ page }) => {
    const home = await page.goto("/");
    expect(home?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /สื่อการสอนคุณภาพ/ })).toBeVisible();
    expect(home?.headers()["content-security-policy"]).toContain("default-src 'self'");
    expect(home?.headers()["x-content-type-options"]).toBe("nosniff");
    expect(home?.headers()["strict-transport-security"]).toContain("max-age=");

    await page.goto("/media");
    await expect(page.getByRole("heading", { name: "สื่อทั้งหมด" })).toBeVisible();
    await page.goto("/media/quick-math-p4");
    await expect(page.getByRole("heading", { name: "คณิตคิดไว ป.4" })).toBeVisible();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("protected routes ไม่เปิดข้อมูลโดยไม่มี session", async ({ page }) => {
    await page.goto("/my-library");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-library/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });
});
