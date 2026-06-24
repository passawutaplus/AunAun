import { describe, expect, it } from "vitest";
import { PUBLIC_ROUTES, SITEMAP_EXCLUDED_PATHS, xmlEscape } from "@/lib/sitemap";

describe("sitemap", () => {
  it("includes indexable public routes", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/pricing");
    expect(paths).toContain("/blog");
    expect(paths).toContain("/help");
    expect(paths).toContain("/help/payments");
    expect(paths).toContain("/help/line");
  });

  it("excludes private and auth routes from PUBLIC_ROUTES", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    for (const excluded of SITEMAP_EXCLUDED_PATHS) {
      expect(paths, `must not list ${excluded}`).not.toContain(excluded);
    }
  });

  describe("xmlEscape", () => {
    it("escapes XML special characters", () => {
      expect(xmlEscape("a<b")).toBe("a&lt;b");
      expect(xmlEscape("a&b")).toBe("a&amp;b");
      expect(xmlEscape('a"b')).toBe("a&quot;b");
      expect(xmlEscape("a'b")).toBe("a&apos;b");
      expect(xmlEscape("a>b")).toBe("a&gt;b");
    });

    it("leaves safe slugs unchanged", () => {
      expect(xmlEscape("freelance-tax-tips-2025")).toBe("freelance-tax-tips-2025");
    });
  });
});
