import { describe, expect, it } from "vitest";
import {
  EXCLUDED_PATHS,
  STATIC_PATHS,
  CATALOG_PROJECT_COUNT,
  buildSitemapUrls,
  buildSitemapXml,
  catalogProjectId,
  catalogUid,
} from "../sitemap-lib.mjs";

describe("sitemap-lib", () => {
  it("includes launch-public static routes", () => {
    const paths = STATIC_PATHS.map((p) => p.loc);
    expect(paths).toContain("/");
    expect(paths).toContain("/legal/community");
    expect(paths).toContain("/legal/copyright-report");
    expect(paths).not.toContain("/jobs");
    expect(paths).not.toContain("/advertise");
    expect(paths).not.toContain("/admin");
  });

  it("builds catalog IDs deterministically", () => {
    expect(catalogUid(0)).toBe("00000000-0000-0000-0000-00000000a000");
    expect(catalogProjectId(1)).toBe("00000000-0000-0000-0002-000000000001");
    expect(catalogProjectId(0x45)).toBe("00000000-0000-0000-0002-000000000045");
  });

  it("excludes private routes from url list", () => {
    const paths = buildSitemapUrls().map((u) => u.loc);
    for (const excluded of EXCLUDED_PATHS) {
      expect(paths, `must not list ${excluded}`).not.toContain(excluded);
    }
    expect(paths.some((p) => p.startsWith("/s/"))).toBe(false);
    expect(paths).not.toContain("/jobs");
  });

  it("includes expanded seed catalog by default", () => {
    const paths = buildSitemapUrls().map((u) => u.loc);
    expect(paths.filter((p) => p.startsWith("/project/"))).toHaveLength(CATALOG_PROJECT_COUNT);
    expect(paths).toContain(`/project/${catalogProjectId(0x45)}`);
  });

  it("adds full-product routes when enabled", () => {
    const paths = buildSitemapUrls({ fullProduct: true }).map((u) => u.loc);
    expect(paths).toContain("/jobs");
    expect(paths).toContain("/community");
    expect(paths.some((p) => p.startsWith("/s/"))).toBe(true);
  });

  it("merges live vanity handles and series", () => {
    const paths = buildSitemapUrls({
      vanityHandles: ["phatsawut", "@demo.user"],
      seriesIds: ["3b43c6a6-9530-4598-a7ce-44c61b7b14bb"],
      projectIds: ["abc"],
      profileUserIds: ["uid-1"],
    }).map((u) => u.loc);
    expect(paths).toContain("/@phatsawut");
    expect(paths).toContain("/@demo.user");
    expect(paths).toContain("/series/3b43c6a6-9530-4598-a7ce-44c61b7b14bb");
    expect(paths).toContain("/project/abc");
    expect(paths).toContain("/u/uid-1");
  });

  it("generates well-formed XML with absolute URLs", () => {
    const xml = buildSitemapXml("https://aplus1.app");
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://aplus1.app/</loc>");
    expect(xml).toContain("<loc>https://aplus1.app/legal/community</loc>");
    expect(xml).not.toMatch(/<loc>[^<]*\/admin<\/loc>/);
    expect(xml).not.toMatch(/<loc>[^<]*\/jobs<\/loc>/);
  });
});
