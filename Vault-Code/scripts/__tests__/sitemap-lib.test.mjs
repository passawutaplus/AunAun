import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EXCLUDED_PATHS,
  STATIC_PATHS,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapUrls,
  buildSitemapXml,
} from "../sitemap-lib.mjs";

describe("vault sitemap-lib", () => {
  it("lists only public legal page", () => {
    const urls = buildSitemapUrls().map((u) => u.loc);
    assert.deepEqual(urls, ["/legal"]);
    for (const excluded of EXCLUDED_PATHS) {
      assert.equal(urls.includes(excluded), false, `sitemap must exclude ${excluded}`);
    }
  });

  it("builds sitemap xml with base url", () => {
    const xml = buildSitemapXml("https://aplus-vault.vercel.app");
    assert.match(xml, /<urlset/);
    assert.match(xml, /<loc>https:\/\/aplus-vault\.vercel\.app\/legal<\/loc>/);
    assert.doesNotMatch(xml, /\/vault/);
    assert.doesNotMatch(xml, /\/demo/);
  });

  it("builds robots.txt with disallows and sitemap", () => {
    const robots = buildRobotsTxt("https://aplus-vault.vercel.app");
    assert.match(robots, /Disallow: \/vault/);
    assert.match(robots, /Disallow: \/demo/);
    assert.match(robots, /Disallow: \/api\//);
    assert.match(robots, /Sitemap: https:\/\/aplus-vault\.vercel\.app\/sitemap\.xml/);
  });

  it("builds llms.txt with legal link", () => {
    const llms = buildLlmsTxt("https://aplus-vault.vercel.app");
    assert.match(llms, /A\+ Vault/);
    assert.match(llms, /https:\/\/aplus-vault\.vercel\.app\/legal/);
    assert.match(llms, /not indexed/i);
  });

  it("static paths stay stable", () => {
    assert.equal(STATIC_PATHS.length, 1);
    assert.equal(STATIC_PATHS[0].loc, "/legal");
  });
});
