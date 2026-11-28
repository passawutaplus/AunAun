import { describe, expect, it } from "vitest";
import type { ShowcaseRow } from "@/server/queries/showcase";
import { formatCount, licenceLine, neighbour, pickSimilar, workDateLine, workMedia, workText } from "../workContent";

const base = {
  content_blocks: [] as unknown,
  gallery_urls: [] as string[],
  video_urls: [] as string[],
  media_sizes: {} as Record<string, [number, number]>,
  cover_url: null as string | null,
  cover_width: null as number | null,
  cover_height: null as number | null,
};

describe("workMedia", () => {
  it("takes the picture blocks in order with their recorded sizes", () => {
    const media = workMedia({
      ...base,
      content_blocks: [
        { id: "h", type: "heading", heading: "Hi" },
        { id: "a", type: "image", url: "https://x/a.webp", size: [800, 600] },
        { id: "b", type: "image_text", url: "https://x/b.webp", body: "words" },
        { id: "c", type: "image", urls: ["https://x/c1.webp", "https://x/c2.webp"] },
      ],
      gallery_urls: ["https://x/other.webp"],
      media_sizes: { "https://x/b.webp": [1000, 2000] },
    });
    expect(media.map((m) => m.url)).toEqual(["https://x/a.webp", "https://x/b.webp", "https://x/c1.webp", "https://x/c2.webp"]);
    expect(media[0].ratio).toBeCloseTo(800 / 600);
    expect(media[1].ratio).toBeCloseTo(0.5);
    expect(media[2].ratio).toBeNull();
  });

  it("falls back to the gallery when no block holds a picture", () => {
    const media = workMedia({ ...base, gallery_urls: ["https://x/g1.png", "https://x/g2.png"] });
    expect(media.map((m) => m.url)).toEqual(["https://x/g1.png", "https://x/g2.png"]);
  });

  it("lists the same picture once", () => {
    const media = workMedia({
      ...base,
      content_blocks: [
        { id: "a", type: "image", url: "https://x/a.webp" },
        { id: "b", type: "image", url: "https://x/a.webp" },
      ],
    });
    expect(media).toHaveLength(1);
  });
});

describe("workText", () => {
  it("puts the text of the blocks under the description", () => {
    const text = workText({
      description: "Short.",
      content_blocks: [
        { id: "h", type: "heading", heading: "Process" },
        { id: "i", type: "image", url: "https://x/a.webp" },
        { id: "b", type: "body", body: "Inks on paper." },
      ],
    });
    expect(text).toBe("Short.\n\nProcess\n\nInks on paper.");
  });

  it("does not repeat a description that is also the only block", () => {
    expect(workText({ description: "Same", content_blocks: [{ id: "b", type: "body", body: "Same" }] })).toBe("Same");
  });

  it("turns the old editor's HTML into lines and drops lines the description has", () => {
    const text = workText({
      description: "Tra+veler\nนักเดินทาง",
      content_blocks: [
        { id: "a", type: "image_text", url: "https://x/a.webp", body: "<p>นักเดินทาง<br>.</p><p style=\"text-align:center\"><b>ผู้สำรวจ</b> &amp; ใจ&nbsp;ตัวเอง</p>" },
      ],
    });
    expect(text).toBe("Tra+veler\nนักเดินทาง\n\n.\nผู้สำรวจ & ใจ ตัวเอง");
  });

  it("is empty for a work without words", () => {
    expect(workText({ description: null, content_blocks: null })).toBe("");
  });
});

describe("small formatters", () => {
  it("formats like counts like the mock", () => {
    expect(formatCount(860)).toBe("860");
    expect(formatCount(1200)).toBe("1.2K");
    expect(formatCount(2000)).toBe("2K");
  });

  it("writes the date line", () => {
    expect(workDateLine("2026-06-05T10:00:00Z", 1240)).toBe("5 Jun 2026 · 1,240 views");
  });

  it("only words the licence the mock has", () => {
    expect(licenceLine("all_rights", "mintra.k")).toBe("All rights reserved · © mintra.k");
    expect(licenceLine(null, "mintra.k")).toBe("All rights reserved · © mintra.k");
    expect(licenceLine("attribution_ok", "mintra.k")).toBeNull();
  });
});

describe("pickSimilar / neighbour", () => {
  const row = (id: string, owner: string, cat: string | null): ShowcaseRow => ({
    id,
    title: id,
    cover_url: null,
    gallery_urls: null,
    owner_id: owner,
    created_at: "2026-01-01",
    cover_width: null,
    cover_height: null,
    sc_category: cat,
  });

  it("puts the same category from other people first and never the owner's works", () => {
    const works = [row("1", "me", "Zine"), row("2", "b", "Photography"), row("3", "c", "Zine"), row("4", "me", "Zine"), row("5", "d", "3D")];
    const picked = pickSimilar(works, { id: "1", owner_id: "me", sc_category: "Zine" }, 3);
    expect(picked.map((w) => w.id)).toEqual(["3", "2", "5"]);
  });

  it("goes round the list both ways", () => {
    expect(neighbour(["a", "b", "c"], "a", -1)).toBe("c");
    expect(neighbour(["a", "b", "c"], "c", 1)).toBe("a");
    expect(neighbour(["a"], "a", 1)).toBeNull();
    expect(neighbour(["a", "b"], "x", 1)).toBeNull();
  });
});
