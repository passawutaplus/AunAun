import { describe, expect, it } from "vitest";
import {
  EXCLUDED_PATHS,
  STATIC_PATHS,
  buildSitemapUrls,
  buildSitemapXml,
  catalogProjectId,
  catalogUid,
} from "../sitemap-lib.mjs";

describe("sitemap-lib", () => {
  it("includes public static routes", () => {
    const paths = STATIC_PATHS.map((p) => p.loc);
    expect(paths).toContain("/");
    expect(paths).toContain("/jobs");
    expect(paths).not.toContain("/admin");
  });

  it("builds catalog IDs deterministically", () => {
    expect(catalogUid(0)).toBe("00000000-0000-0000-0000-00000000a000");
    expect(catalogProjectId(1)).toBe("00000000-0000-0000-0002-000000000001");
  });

  it("excludes private routes from url list", () => {
    const paths = buildSitemapUrls().map((u) => u.loc);
    for (const excluded of EXCLUDED_PATHS) {
      expect(paths, `must not list ${excluded}`).not.toContain(excluded);
    }
  });

  it("generates well-formed XML with absolute URLs", () => {
    const xml = buildSitemapXml("https://pixel100.com");
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://pixel100.com/jobs</loc>");
    expect(xml).not.toMatch(/<loc>[^<]*\/admin<\/loc>/);
  });
});
