import { expect, test } from "@playwright/test";

test("หน้าแรกใช้ภาษาไทยและ Visual Direction ของ KruPo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /สื่อการสอนคุณภาพ/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "KruPo คลังสื่อ" }).first()).toBeVisible();
});

test("ค้นหาและ Filter สื่อ", async ({ page }) => {
  await page.goto("/media");
  const filters = page.locator("aside");
  await filters.getByLabel("คำค้น").fill("ระบบสุริยะ");
  await filters.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
  await expect(page.getByText("ระบบสุริยะ").first()).toBeVisible();
  await filters.getByLabel("ฟรี").check();
  await filters.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
  await expect(page).toHaveURL(/price=free/);
});

test("สมัครและเข้าสู่ระบบมีโครงสร้าง Email และ Google", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "สมัครสมาชิก" })).toBeVisible();
  await expect(page.getByLabel("ชื่อที่แสดง")).toBeVisible();
  await expect(page.getByRole("link", { name: "เข้าสู่ระบบด้วย Google" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByLabel("อีเมล")).toBeVisible();
  await expect(page.getByLabel("รหัสผ่าน")).toBeVisible();
});

test("สมัคร Creator และยืนยันข้อตกลงผู้ขาย", async ({ page }) => {
  await page.goto("/creator");
  await expect(page.getByRole("heading", { name: "สมัครเป็นผู้สร้างสื่อ" })).toBeVisible();
  await expect(page.getByText(/ฉันยืนยันว่าเป็นเจ้าของ/)).toBeVisible();
  await expect(page.locator("#main").getByRole("link", { name: "ข้อตกลงผู้ขาย" })).toBeVisible();
});

test("ส่งสื่อเข้าสู่ Temporary Review Area", async ({ page }) => {
  await page.goto("/creator/media/new");
  await expect(page.getByRole("heading", { name: "เพิ่มสื่อใหม่" })).toBeVisible();
  await expect(page.getByText(/Temporary Review Area/)).toBeVisible();
  await expect(page.getByLabel("Ownership Evidence")).toBeVisible();
  await expect(page.getByRole("button", { name: "ส่งเข้าตรวจสอบ" })).toBeVisible();
});

test("Admin Review แสดงขั้นตอน Human review", async ({ page }) => {
  await page.goto("/admin/reviews");
  await expect(page.getByRole("heading", { name: "สื่อรอตรวจ" })).toBeVisible();
  await expect(page.getByText(/ผู้ตรวจเป็นผู้ตัดสินใจ/)).toBeVisible();
});

test("Free media มี CTA เล่นฟรีและ Paid media ถูกล็อกก่อนซื้อ", async ({ page }) => {
  await page.goto("/media/word-mission");
  await expect(page.getByRole("link", { name: "เล่นฟรี" })).toBeVisible();
  await page.goto("/media/quick-math-p4");
  await expect(page.getByRole("link", { name: "ปลดล็อก" })).toBeVisible();
  await expect(page.getByRole("link", { name: "เล่นฟรี" })).toHaveCount(0);
});

test("Cart บังคับขั้นต่ำ 10 บาท", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText(/ยอดชำระขั้นต่ำ 10 บาท/)).toBeVisible();
  await expect(page.getByRole("button", { name: "ดำเนินการชำระเงิน" })).toBeDisabled();
});

test("My Library แสดง action ตาม delivery type", async ({ page }) => {
  await page.goto("/my-library");
  await expect(page.getByRole("heading", { name: "คลังสื่อของฉัน" })).toBeVisible();
  await expect(page.getByRole("link", { name: "เปิดสื่อ" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "ดาวน์โหลด" }).first()).toBeVisible();
});

test("Link health และ Copyright complaint อยู่ใน Admin workflow", async ({ page }) => {
  await page.goto("/admin/links");
  await expect(page.getByRole("heading", { name: "ตรวจลิงก์" })).toBeVisible();
  await expect(page.getByText(/403 ไม่ถูกถือว่าเสีย/)).toBeVisible();
  await page.goto("/copyright/report");
  await expect(page.getByRole("heading", { name: "แจ้งปัญหาลิขสิทธิ์" })).toBeVisible();
  await expect(page.getByLabel("หลักฐาน")).toBeVisible();
});
