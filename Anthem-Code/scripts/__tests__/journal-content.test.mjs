import { describe, expect, it } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { JOURNAL_ARTICLES, JOURNAL_CATEGORIES, loadJournalContent } from "../../src/data/journal/articles.js";
import { JOURNAL_CONTENT } from "../../src/data/journal/content/index.js";

const root = path.resolve(import.meta.dirname, "..", "..");

describe("journal content", () => {
  it("every article has content in the server index", () => {
    for (const a of JOURNAL_ARTICLES) expect(JOURNAL_CONTENT[a.slug], a.slug).toBeTruthy();
    expect(Object.keys(JOURNAL_CONTENT).sort()).toEqual(JOURNAL_ARTICLES.map((a) => a.slug).sort());
  });

  it("slugs are unique and categories valid", () => {
    const slugs = JOURNAL_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of JOURNAL_ARTICLES) expect(JOURNAL_CATEGORIES[a.category], a.slug).toBeTruthy();
  });

  it("follows the article pattern: >=2 https sources, cover file exists, media have alt", () => {
    for (const a of JOURNAL_ARTICLES) {
      const c = JOURNAL_CONTENT[a.slug];
      expect(c.sources.length, a.slug).toBeGreaterThanOrEqual(2);
      for (const s of c.sources) expect(s.url, a.slug).toMatch(/^https:\/\//);
      expect(existsSync(path.join(root, "public", a.image.src)), a.image.src).toBe(true);
      for (const b of c.body) {
        const m = b.img || b.graphic;
        if (!m) continue;
        expect(m.alt, a.slug).toBeTruthy();
        expect(existsSync(path.join(root, "public", m.src)), m.src).toBe(true);
        if (b.img) expect(b.img.credit, a.slug).toBeTruthy();
      }
    }
  });

  it("loadJournalContent rejects unknown slugs", async () => {
    expect(await loadJournalContent("../../etc/passwd")).toBeUndefined();
    const c = await loadJournalContent(JOURNAL_ARTICLES[0].slug);
    expect(c.body.length).toBeGreaterThan(0);
  });

  it("content folder has no orphan files", () => {
    const files = readdirSync(path.join(root, "src/data/journal/content")).filter((f) => f !== "index.js");
    expect(files.length).toBe(JOURNAL_ARTICLES.length);
  });
});
