import { expect, test } from "@playwright/test";

test("Mobile navigation มี touch targets หลักอย่างน้อย 44px", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "เมนูมือถือ" });
  await expect(navigation).toBeVisible();
  const heights = await navigation.getByRole("link").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
  expect(heights.every((height) => height >= 44)).toBe(true);
  await page.getByRole("link", { name: "ค้นหา", exact: true }).click();
  await expect(page.getByRole("heading", { name: "สื่อทั้งหมด" })).toBeVisible();
});

test("หน้า Catalog มือถือไม่มี horizontal overflow และตัวกรองใช้งานได้", async ({ page }) => {
  await page.goto("/media");
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  const mobileFilters = page.locator("details");
  await mobileFilters.getByText("เปิดตัวกรอง").click();
  await mobileFilters.getByLabel("คำค้น").fill("ภาษาอังกฤษ");
  await mobileFilters.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
  await expect(page.getByText("ภารกิจคำศัพท์").first()).toBeVisible();
});

test("Admin มือถือเข้าถึง Health Center และ Kill switch ได้", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("Kill switches")).toBeVisible();
  await page.getByRole("link", { name: "Health Center" }).click();
  await expect(page.getByRole("heading", { name: "Health Center" })).toBeVisible();
});
