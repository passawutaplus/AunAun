import { test, expect } from "@playwright/test";
import { seedCookieConsent } from "../helpers/cookie";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? "phatsawut@demo.pixel100.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "";
const DEMO_CONV_ID = "00000000-0000-0000-000c-000000000005";

async function signInDemo(page: import("@playwright/test").Page) {
  await seedCookieConsent(page);
  await page.goto("/auth");
  await page.getByLabel(/อีเมล|email/i).first().fill(DEMO_EMAIL);
  await page.getByLabel(/รหัสผ่าน|password/i).first().fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 15_000 });
}

test.describe("chat smoke @demo", () => {
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD is required for demo chat tests.");

  test("inbox lists conversations and opens a thread", async ({ page }) => {
    await signInDemo(page);
    await page.goto("/chat");
    await expect(page.getByRole("navigation", { name: "ตัวกรองแชท" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("aside ul li button").first()).toBeVisible({ timeout: 15_000 });

    await page.locator("aside ul li button").first().click();
    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+/i, { timeout: 10_000 });
    await expect(page.getByPlaceholder(/พิมพ์ข้อความ|คุยเล่น/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("direct thread URL renders composer and partner panel on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInDemo(page);
    await page.goto(`/chat/${DEMO_CONV_ID}`);
    await expect(page.getByPlaceholder(/พิมพ์ข้อความ/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "แนบรูป" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/UI App จองคิวสปา|ฉัตรชัย/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("ผลงานของฉัน")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("โหลดแชทไม่สำเร็จ")).toHaveCount(0);
  });

  test("left rail has back and conversation filters", async ({ page }) => {
    await signInDemo(page);
    await page.goto("/chat");
    const rail = page.getByRole("navigation", { name: "ตัวกรองแชท" });
    await expect(rail).toBeVisible({ timeout: 15_000 });
    await expect(rail.getByRole("button", { name: "กลับหน้าก่อนหน้า" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "ทั้งหมด" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "งานจ้าง" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "คอลแลป" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "กลุ่ม" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chating" })).toBeVisible();
    await expect(page.getByRole("button", { name: "กลับหน้าแรก" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "My Studio" })).toBeVisible();
    await expect(page.getByRole("button", { name: /แจ้งเตือน/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "โปรไฟล์" })).toBeVisible();
  });
});
