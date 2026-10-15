import { expect, test } from "@playwright/test";

test("scroll-linked introduction reaches the real login form", async ({ page }) => {
  await page.goto("/");
  const journey = page.locator(".learning-journey");
  await expect(journey).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => journey.evaluate(el => Number((el as HTMLElement).style.getPropertyValue("--journey-progress")))).toBeGreaterThan(0);
  await page.getByRole("link", { name: "เริ่มใช้งาน", exact: true }).click();
  const form = page.locator("#start-learning form");
  await expect(form).toHaveAttribute("action", "/api/auth/login");
  await expect(form.getByLabel("อีเมล")).toBeVisible();
  await expect(form.locator('input[name="next"]')).toHaveValue("/my-library");
});

test("email login retains return path and password visibility", async ({ page }) => {
  await page.goto("/login?next=%2Fcart");
  await expect(page.locator('input[name="next"]')).toHaveValue("/cart");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("a-preview-password");
  await page.getByRole("button", { name: "แสดงรหัสผ่าน" }).click();
  await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "ซ่อนรหัสผ่าน" }).click();
  await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("link", { name: "สมัครสมาชิก", exact: true }).click();
  await expect(page).toHaveURL(/next=%2Fcart/);
});

test("catalog sorting is submitted and preserves search", async ({ page }) => {
  await page.goto("/media?q=คณิต");
  await page.getByLabel("เรียงตาม", { exact: true }).selectOption("price-low");
  await page.getByRole("button", { name: "เรียงสื่อ" }).click();
  await expect(page).toHaveURL(/sort=price-low/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("คณิต");
});

test("reduced motion removes the long pinned introduction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".journey-pin")).toHaveCSS("position", "relative");
  await expect(page.locator("#start-learning form")).toHaveAttribute("method", "post");
});
