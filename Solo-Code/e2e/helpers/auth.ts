import type { Page } from "@playwright/test";
import { getAccount, type Role } from "../fixtures/accounts";

/**
 * Sign in a test user via the email/password form.
 * Selectors target Thai labels — keep in sync with src/routes/auth.tsx
 */
export async function signIn(page: Page, role: Role) {
  const { email, password } = getAccount(role);
  await page.goto("/auth");

  // Accept either Thai or English labels; getByLabel falls back to placeholder.
  const emailInput = page.getByLabel(/อีเมล|email/i).first();
  const passwordInput = page.getByLabel(/รหัสผ่าน|password/i).first();
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submit = page
    .getByRole("button", { name: /เข้าสู่ระบบ|ลงชื่อเข้าใช้|sign in|log in/i })
    .first();
  await submit.click();

  // Wait until we land somewhere authenticated (dashboard or apply)
  await page.waitForURL(/\/(dashboard|apply|admin)/, { timeout: 15_000 });
}

export async function signOut(page: Page) {
  await page.goto("/dashboard?tab=settings");
  // Click any visible "ออกจากระบบ" / "Sign out" trigger
  const trigger = page.getByRole("button", { name: /ออกจากระบบ|sign out|log out/i }).first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
  }
  await page.waitForURL(/\/auth/, { timeout: 10_000 }).catch(() => {});
}
