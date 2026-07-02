import type { Page } from "@playwright/test";
import { getAccount, type Role } from "../fixtures/accounts";

async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole("button", { name: /ยอมรับทั้งหมด|accept all|allow all/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

/**
 * Sign in a test user via the email/password form.
 * Prefer stable data-testid selectors; fall back to labels.
 */
export async function signIn(page: Page, role: Role) {
  const { email, password } = getAccount(role);
  await page.goto("/auth?tab=login");
  await dismissCookieBanner(page);

  const loginTab = page.getByTestId("auth-tab-login");
  if (await loginTab.isVisible().catch(() => false)) {
    await loginTab.click();
  }

  const emailInput = page
    .getByTestId("login-email")
    .or(page.locator("#login-email"))
    .or(page.getByLabel(/อีเมล|email/i))
    .first();
  const passwordInput = page
    .getByTestId("login-password")
    .or(page.locator("#login-pass"))
    .or(page.getByLabel(/รหัสผ่าน|password/i))
    .first();

  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submit = page
    .getByTestId("login-submit")
    .or(page.getByRole("button", { name: /^เข้าสู่ระบบ$|ลงชื่อเข้าใช้|sign in|log in/i }))
    .first();
  await submit.click();

  await page.waitForURL(/\/(dashboard|apply|admin)/, { timeout: 15_000 });
}

export async function signOut(page: Page) {
  await page.goto("/dashboard?tab=settings");
  const trigger = page.getByRole("button", { name: /ออกจากระบบ|sign out|log out/i }).first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
  }
  await page.waitForURL(/\/auth/, { timeout: 10_000 }).catch(() => {});
}
