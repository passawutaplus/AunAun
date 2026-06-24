import { test, expect } from "@playwright/test";

/**
 * SEO smoke — static index.html + SPA SeoHead updates after hydration.
 * Run with: bun run e2e:seo  (or included in e2e:smoke via *.smoke.spec.ts)
 */
test.describe("SEO @public", () => {
  test("home has description and OG meta after hydration", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/pixel100/i);
    await expect(page.locator('meta[name="description"]').first()).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:title"]').first()).toHaveAttribute("content", /Pixel100/i);
    await expect(page.locator('meta[name="twitter:card"]').first()).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("home injects JSON-LD WebSite schema", async ({ page }) => {
    await page.goto("/");
    const jsonLd = page.locator('script[type="application/ld+json"]#seo-jsonld');
    await expect(jsonLd).toHaveCount(1);
    const text = await jsonLd.textContent();
    expect(text).toContain('"@type":"WebSite"');
    expect(text).toContain("Pixel100");
  });

  test("home has absolute canonical in static HTML", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute("href", /^https:\/\//);
  });

  test("jobs page updates title and robots after navigation", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page).toHaveTitle(/งาน|Pixel100/i);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", "index, follow");
    await expect(page.locator('meta[property="og:url"]').first()).toHaveAttribute("content", /\/jobs$/);
  });
});
