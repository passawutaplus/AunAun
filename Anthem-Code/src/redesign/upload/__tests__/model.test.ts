import { describe, expect, it } from "vitest";
import { bodyFromBlocks } from "../../work/WorkBody";
import {
  DEFAULT_TEXT_STYLE,
  emptyDraft,
  fromWork,
  isScContent,
  parseTags,
  readiness,
  toWorkFields,
  type Draft,
  type Media,
  type StoredWork,
} from "../model";

const img = (url: string, size: [number, number] | null = [1200, 800]): Media => ({ kind: "image", url, size, progress: null, name: "a.jpg" });
let n = 0;
const nid = () => `x${++n}`;

const base: StoredWork = {
  title: "Old",
  description: "<p>Hello &amp; welcome</p>",
  sc_category: "Risograph",
  tags: ["riso", "poster"],
  content_blocks: [],
  gallery_urls: [],
  video_urls: [],
  cover_url: null,
  cover_width: null,
  cover_height: null,
  media_sizes: {},
};

describe("parseTags", () => {
  it("splits on commas, drops # and repeats", () => {
    expect(parseTags("riso, #Poster，poster、 zine\n")).toEqual(["riso", "Poster", "zine"]);
  });
  it("keeps at most 15", () => {
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(","))).toHaveLength(15);
  });
});

describe("toWorkFields (Basic)", () => {
  const d: Draft = {
    ...emptyDraft("r1"),
    title: "  Night  ",
    category: "Risograph",
    desc: "line 1\nline 2",
    tags: "riso, poster",
    blocks: [
      { id: "a", type: "image" },
      { id: "t", type: "text", text: "A <b> note\nnext", style: { ...DEFAULT_TEXT_STYLE, bold: true } },
      { id: "b", type: "image" },
      { id: "up", type: "image" },
      { id: "v", type: "video" },
      { id: "empty", type: "text", text: "  ", style: DEFAULT_TEXT_STYLE },
    ],
    coverId: "b",
  };
  const media: Record<string, Media> = {
    a: img("https://x/a.webp"),
    b: img("https://x/b.webp", [800, 1000]),
    up: { kind: "image", url: "", preview: "blob:1", size: null, progress: 40, name: "c.jpg" },
    v: { kind: "video", url: "https://x/v.mp4", poster: "https://x/p.jpg", size: null, progress: null, name: "v.mp4" },
  };
  const f = toWorkFields("Basic", d, media);

  it("writes finished media only, in order, with sizes", () => {
    expect(f.gallery_urls).toEqual(["https://x/a.webp", "https://x/b.webp"]);
    expect(f.video_urls).toEqual(["https://x/v.mp4"]);
    expect(f.media_sizes).toEqual({ "https://x/a.webp": [1200, 800], "https://x/b.webp": [800, 1000] });
    expect(f.content_blocks.map((b) => (b as { type: string }).type)).toEqual(["image", "body", "image", "video"]);
  });
  it("uses the starred cover and its size", () => {
    expect([f.cover_url, f.cover_width, f.cover_height]).toEqual(["https://x/b.webp", 800, 1000]);
  });
  it("keeps the old site readable: escaped HTML body + legacy category", () => {
    const t = f.content_blocks[1] as Record<string, unknown>;
    expect(t.body).toBe("A &lt;b&gt; note<br>next");
    expect(t.scText).toBe("A <b> note\nnext");
    expect(f.category).toBe("Illustration / Art");
    expect(f.sc_category).toBe("Risograph");
    expect(f.title).toBe("Night");
    expect(f.tags).toEqual(["riso", "poster"]);
  });
  it("is ready with an image, a title and a category", () => {
    expect(readiness("Basic", d, media).ready).toBe(true);
    expect(readiness("Basic", { ...d, category: null }, media).ready).toBe(false);
  });
});

describe("toWorkFields (Template) and back", () => {
  const d: Draft = {
    ...emptyDraft("r1"),
    title: "Grid",
    category: "Photography",
    rows: [
      { id: "r1", layout: "Image + Caption" },
      { id: "r2", layout: "Two Up" },
    ],
    fills: { "r1:0": "m1", "r2:1": "m2" },
    fit: { "r2:1": true },
    slotTexts: { "r1:1": { text: "caption", style: { ...DEFAULT_TEXT_STYLE, align: "center" } } },
  };
  const media = { m1: img("https://x/1.webp", [1600, 900]), m2: img("https://x/2.webp", [900, 1600]) };
  const f = toWorkFields("Template", d, media);

  it("stores one sc_layout block per row; the cover is the first filled picture slot", () => {
    expect(f.content_blocks).toEqual([
      { id: "r1", type: "sc_layout", layout: "Image + Caption", cells: [{ image: "https://x/1.webp", size: [1600, 900] }, { text: "caption", style: { ...DEFAULT_TEXT_STYLE, align: "center" } }] },
      { id: "r2", type: "sc_layout", layout: "Two Up", cells: [null, { image: "https://x/2.webp", size: [900, 1600], fit: true }] },
    ]);
    expect(f.cover_url).toBe("https://x/1.webp");
    expect(isScContent(f.content_blocks)).toBe(true);
  });

  it("opens again as the same Template", () => {
    const o = fromWork({ ...base, content_blocks: f.content_blocks, media_sizes: f.media_sizes, cover_url: f.cover_url }, nid);
    expect(o.mode).toBe("Template");
    expect(o.draft.rows.map((r) => r.layout)).toEqual(["Image + Caption", "Two Up"]);
    expect(o.draft.fit).toEqual({ "r2:1": true });
    expect(o.draft.slotTexts["r1:1"].text).toBe("caption");
    expect(Object.values(o.media).map((m) => m.url)).toEqual(["https://x/1.webp", "https://x/2.webp"]);
    expect(toWorkFields(o.mode, o.draft, o.media).content_blocks).toEqual(f.content_blocks);
  });

  it("is what the Work page shows", () => {
    const items = bodyFromBlocks(f.content_blocks, f.media_sizes);
    expect(items.map((i) => i.kind)).toEqual(["row", "row"]);
  });
});

describe("fromWork (old editor)", () => {
  it("turns old blocks into Basic blocks", () => {
    const o = fromWork(
      {
        ...base,
        cover_url: "https://x/c.jpg",
        content_blocks: [
          { id: "1", type: "heading", heading: "Title &amp; more" },
          { id: "2", type: "image_text", url: "https://x/it.jpg", body: "<p>side</p>", splitSide: "text_left" },
          { id: "3", type: "image", urls: ["https://x/g1.jpg", "https://x/c.jpg"], mediaLayout: "gallery" },
          { id: "4", type: "video", url: "https://x/v.mp4", posterUrl: "https://x/p.jpg" },
          { id: "5", type: "unknown" },
        ],
        media_sizes: { "https://x/g1.jpg": [10, 20] },
      },
      nid,
    );
    expect(o.mode).toBe("Basic");
    const kinds = o.draft.blocks.map((b) => (b.type === "text" ? `text:${b.text}` : o.media[b.id].url));
    expect(kinds).toEqual(["text:Title & more", "text:side", "https://x/it.jpg", "https://x/g1.jpg", "https://x/c.jpg", "https://x/v.mp4"]);
    expect((o.draft.blocks[0] as { style: { size: number } }).style.size).toBe(24);
    expect(o.media[o.draft.coverId!].url).toBe("https://x/c.jpg");
    expect(o.draft.desc).toBe("Hello & welcome");
    expect(o.draft.tags).toBe("riso, poster");
    expect(o.draft.category).toBe("Risograph");
  });

  it("falls back to gallery_urls when no block holds media", () => {
    const o = fromWork({ ...base, gallery_urls: ["https://x/a.jpg"], video_urls: ["https://x/v.mp4"] }, nid);
    expect(o.draft.blocks.map((b) => b.type)).toEqual(["image", "video"]);
  });

  it("is not new-editor content", () => {
    expect(isScContent([{ type: "body", body: "<p>x</p>" }])).toBe(false);
  });
});
