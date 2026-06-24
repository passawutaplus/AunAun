import { test, expect } from "@playwright/test";

/**
 * Public-route smoke — runs without authentication.
 * Verifies that anonymous visitors can reach marketing pages and that
 * none of those pages leak the service role key.
 */
test.describe("public routes (smoke)", () => {
  for (const path of ["/", "/pricing", "/blog", "/terms", "/privacy", "/cookies"]) {
    test(`GET ${path} returns OK + no service_role leak`, async ({ page }) => {
      const resp = await page.goto(path);
      expect(resp?.status(), `${path} status`).toBeLessThan(400);
      const html = await page.content();
      expect(html, `${path} must not leak service role`).not.toContain("service_role");
      // Basic security header presence — middleware should set CSP
      const headers = resp?.headers() ?? {};
      expect(headers["x-content-type-options"], "X-Content-Type-Options").toBe("nosniff");
    });
  }

  test("protected route redirects guest", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    expect(page.url()).toContain("/auth");
  });

  test("admin route redirects guest", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/(auth|dashboard)/, { timeout: 10_000 });
  });
});
