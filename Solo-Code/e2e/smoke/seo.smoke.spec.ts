import { test, expect } from "@playwright/test";

/**
 * SEO smoke — SSR meta tags, structured data, and lang attribute.
 * Run with: bun run e2e:seo  (or included in e2e:smoke via *.smoke.spec.ts)
 */
test.describe("SEO @public", () => {
  test("home page has SSR title, OG, JSON-LD, and lang=th", async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.status()).toBeLessThan(400);

    const html = await page.content();
    expect(html).toMatch(/So1o/i);
    expect(html).toContain('property="og:image"');
    expect(html).toContain("application/ld+json");
    expect(html).toContain('lang="th"');

    await expect(page.locator('meta[name="description"]').first()).toHaveAttribute("content", /.+/);
  });

  test("pricing page has distinct title", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveTitle(/pricing|ราคา|So1o/i);
  });

  test("auth page has noindex robots meta", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/i,
    );
  });

  test("help center has OG tags and FAQ JSON-LD", async ({ page }) => {
    await page.goto("/help");
    const html = await page.content();
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('"FAQPage"');
    await expect(page).toHaveTitle(/ช่วยเหลือ|So1o/i);
  });
});
