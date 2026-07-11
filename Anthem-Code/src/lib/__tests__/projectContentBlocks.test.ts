import { describe, expect, it } from "vitest";
import {
  blocksFromLegacyDescription,
  flattenContentBlocks,
  hasMediaBlocks,
  hydrateProjectCanvas,
  mergeContentBlocks,
  parseContentBlocks,
  parseGalleryDisplayMode,
  splitMediaFromBlocks,
  toStoredContentBlocks,
} from "../projectContentBlocks";

describe("projectContentBlocks", () => {
  it("parses and stores heading/body blocks", () => {
    const raw = [
      { id: "a", type: "heading", heading: "Hello" },
      { id: "b", type: "body", body: "World" },
    ];
    expect(parseContentBlocks(raw)).toHaveLength(2);
    expect(toStoredContentBlocks(raw as never)).toEqual([
      { id: "a", type: "heading", heading: "Hello" },
      { id: "b", type: "body", body: "World" },
    ]);
  });

  it("parses image/video blocks", () => {
    const raw = [
      { id: "i1", type: "image", url: "https://cdn.example/a.jpg" },
      { id: "v1", type: "video", url: "https://cdn.example/a.mp4" },
      { id: "t1", type: "body", body: "note" },
    ];
    const parsed = parseContentBlocks(raw);
    expect(parsed).toHaveLength(3);
    expect(hasMediaBlocks(parsed)).toBe(true);
    expect(splitMediaFromBlocks(parsed)).toEqual({
      gallery_urls: ["https://cdn.example/a.jpg", "https://cdn.example/a.mp4"],
      video_urls: ["https://cdn.example/a.mp4"],
    });
  });

  it("hydrates legacy gallery + text into canvas", () => {
    const canvas = hydrateProjectCanvas({
      content_blocks: [{ id: "t", type: "body", body: "story" }],
      gallery_urls: ["https://cdn.example/a.jpg"],
      video_urls: [],
    });
    expect(canvas[0]?.type).toBe("image");
    expect(canvas[1]?.type).toBe("body");
  });

  it("prefers media already in content_blocks", () => {
    const canvas = hydrateProjectCanvas({
      content_blocks: [
        { id: "i", type: "image", url: "https://cdn.example/in-block.jpg" },
        { id: "t", type: "body", body: "story" },
      ],
      gallery_urls: ["https://cdn.example/legacy.jpg"],
      video_urls: [],
    });
    expect(canvas).toHaveLength(2);
    expect(canvas[0]?.url).toBe("https://cdn.example/in-block.jpg");
  });

  it("falls back to legacy description", () => {
    const blocks = mergeContentBlocks([], "legacy text");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("body");
    expect(blocks[0]?.body).toBe("legacy text");
  });

  it("flattens blocks for feed description", () => {
    const flat = flattenContentBlocks([
      { id: "1", type: "heading", heading: "Title" },
      { id: "2", type: "body", body: "Detail" },
      { id: "3", type: "image", url: "https://cdn.example/x.jpg" },
    ]);
    expect(flat).toContain("Title");
    expect(flat).toContain("Detail");
    expect(flat).not.toContain("cdn.example");
  });

  it("parses gallery display mode", () => {
    expect(parseGalleryDisplayMode("single")).toBe("single");
    expect(parseGalleryDisplayMode("gallery")).toBe("gallery");
    expect(parseGalleryDisplayMode("grid")).toBe("grid");
    expect(parseGalleryDisplayMode(undefined)).toBe("gallery");
  });

  it("creates body block from legacy description", () => {
    expect(blocksFromLegacyDescription("  hi  ")[0]?.body).toBe("hi");
    expect(blocksFromLegacyDescription("")).toEqual([]);
  });

  it("parses and stores tight gapAfter between modules", () => {
    const raw = [
      {
        id: "i1",
        type: "image",
        url: "https://cdn.example/a.jpg",
        gapAfter: "tight",
      },
      {
        id: "i2",
        type: "image",
        url: "https://cdn.example/b.jpg",
        gapAfter: "spaced",
      },
    ];
    const parsed = parseContentBlocks(raw);
    expect(parsed[0]?.gapAfter).toBe("tight");
    expect(parsed[1]?.gapAfter).toBeUndefined();
    const stored = toStoredContentBlocks(parsed);
    expect(stored[0]).toMatchObject({ id: "i1", gapAfter: "tight" });
    expect(stored[1]).not.toHaveProperty("gapAfter");
  });

  it("preserves multi/grid slot positions when storing", () => {
    const multi = toStoredContentBlocks([
      {
        id: "m1",
        type: "image",
        mediaLayout: "multi",
        rowColumns: 3,
        urls: ["", "https://cdn.example/mid.jpg", ""],
      },
    ]);
    expect(multi[0]).toMatchObject({
      mediaLayout: "multi",
      rowColumns: 3,
      urls: ["", "https://cdn.example/mid.jpg", ""],
    });

    const grid = toStoredContentBlocks([
      {
        id: "g1",
        type: "image",
        mediaLayout: "grid",
        gridLayout: "three_split",
        urls: ["https://cdn.example/tall.jpg", "", ""],
      },
    ]);
    expect(grid[0]).toMatchObject({
      mediaLayout: "grid",
      gridLayout: "three_split",
      urls: ["https://cdn.example/tall.jpg", "", ""],
    });
  });
});
