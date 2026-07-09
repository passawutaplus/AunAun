import { describe, expect, it } from "vitest";
import {
  blocksFromLegacyDescription,
  flattenContentBlocks,
  mergeContentBlocks,
  parseContentBlocks,
  parseGalleryDisplayMode,
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
    ]);
    expect(flat).toContain("Title");
    expect(flat).toContain("Detail");
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
});
