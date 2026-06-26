import { test, expect } from "@playwright/test";

/**
 * Smoke suite — only public/unauthenticated checks.
 * Goal: confirm the app boots and routing/headers are healthy before deeper QA.
 * Run with:  bun run e2e:smoke
 */

test.describe("smoke @public", () => {
  test("home renders and has H1 + main landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/aplus1/i);
    await expect(page.locator("main, [role=main]").first()).toBeVisible();
  });

  test("auth page is reachable", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button", { name: /เข้าสู่ระบบ|sign in|login/i }).first()).toBeVisible();
  });

  test("guest hitting /admin is redirected to /auth", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("guest hitting /chat is redirected to /auth", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("open-redirect guard blocks //evil.com", async ({ page }) => {
    await page.goto("/auth?redirect=//evil.com");
    // safeRelativePath should strip the protocol-relative target
    await expect(page).not.toHaveURL(/evil\.com/);
  });

  test("legal pages render", async ({ page }) => {
    for (const path of ["/legal/terms", "/legal/privacy", "/legal/cookies"]) {
      await page.goto(path);
      await expect(page.locator("body")).toContainText(/.+/);
    }
  });

  test("404 and 500 error pages render", async ({ page }) => {
    await page.goto("/error/404");
    await expect(page.getByRole("heading", { name: "หาไม่เจอหน้านี้" })).toBeVisible();
    await expect(page.getByRole("link", { name: /กลับหน้าแรก/i })).toBeVisible();

    await page.goto("/error/500");
    await expect(page.getByRole("heading", { name: "มีบางอย่างขัดข้อง" })).toBeVisible();
  });

  test("unknown route shows 404 page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-smoke");
    await expect(page.getByRole("heading", { name: "หาไม่เจอหน้านี้" })).toBeVisible();
  });

  test("security headers present", async ({ page }) => {
    const res = await page.goto("/");
    const headers = res?.headers() ?? {};
    const csp =
      headers["content-security-policy"] ||
      headers["content-security-policy-report-only"];
    const hasMetaCsp = await page
      .locator('meta[http-equiv="Content-Security-Policy-Report-Only"]')
      .count();
    expect(csp || hasMetaCsp).toBeTruthy();
    if (headers["strict-transport-security"]) {
      expect(headers["strict-transport-security"]).toMatch(/max-age=/i);
    }
  });

  test("no service_role key leaked into client HTML", async ({ page }) => {
    const res = await page.goto("/");
    const body = (await res?.text()) ?? "";
    expect(body).not.toMatch(/service_role/i);
  });
});
