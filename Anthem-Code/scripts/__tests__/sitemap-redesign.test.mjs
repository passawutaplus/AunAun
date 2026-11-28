import { describe, expect, it } from "vitest";
import { buildSitemapUrls } from "../sitemap-lib.mjs";
import { redesignRouteFor } from "../../src/redesign/routes";
import { isKnownPublicPath, isRedesignCutPath } from "../../api/seo-preview.js";

const id = (n) => `${String(n).repeat(8)}-1111-1111-1111-111111111111`;

describe("sitemap under the new design (VITE_REDESIGN=true)", () => {
  // Everything the generator can list, with every optional part switched on.
  const urls = buildSitemapUrls({
    redesign: true,
    useSeedCatalog: true,
    fullProduct: true,
    hiringBoard: true,
    projectIds: [id(1)],
    profileUserIds: [id(2)],
    vanityHandles: ["nok"],
    seriesIds: [id(3)],
    collectionIds: [id(4)],
    serviceIds: [id(5)],
    objectIds: [id(6)],
    jobIds: [id(7)],
    explorePaths: ["/explore/tag/poster", "/explore/tool/figma"],
    events: [{ id: id(8), slug: "bkk-design-week" }],
  }).map((u) => u.loc);

  it("lists only pages the new design shows: no cut, moved or 404 URL", () => {
    const env = { VITE_REDESIGN: "true" };
    for (const loc of urls) {
      expect(["page", "legacy"], loc).toContain(redesignRouteFor(loc).kind);
      // Bots get a real page there too (api/seo-preview.js).
      expect(isKnownPublicPath(loc), loc).toBe(true);
      expect(isRedesignCutPath(loc, env), loc).toBe(false);
    }
  });

  it("adds the new text pages", () => {
    expect(urls).toContain("/help");
    expect(urls).toContain("/learn");
    expect(buildSitemapUrls({ useSeedCatalog: false }).map((u) => u.loc)).not.toContain("/help");
  });
});
