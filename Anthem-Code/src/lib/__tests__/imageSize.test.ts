import { afterEach, describe, expect, it, vi } from "vitest";
import { withImageSizes } from "../imageSize";
import { imageSizeFields, parseContentBlocks } from "../projectContentBlocks";

class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  decoding = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(url: string) {
    setTimeout(() => {
      if (url.includes("broken")) return this.onerror?.();
      this.naturalWidth = 1600;
      this.naturalHeight = 900;
      this.onload?.();
    }, 0);
  }
}

describe("image sizes for content blocks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds size to single images only, and skips images that fail to load", async () => {
    vi.stubGlobal("Image", FakeImage);
    const blocks = [
      {
        id: "a",
        type: "image",
        url: "https://x.test/a.webp",
        mediaLayout: "single",
      },
      {
        id: "b",
        type: "image",
        url: "https://x.test/b.webp",
        mediaLayout: "gallery",
        urls: ["1", "2"],
      },
      { id: "c", type: "image", url: "https://x.test/broken.webp" },
      { id: "d", type: "body", body: "hi" },
    ];
    const out = (await withImageSizes(blocks)) as Array<
      Record<string, unknown>
    >;
    expect(out[0].size).toEqual([1600, 900]);
    expect(out[1].size).toBeUndefined();
    expect(out[2].size).toBeUndefined();
    expect(out[3]).toBe(blocks[3]);
  });

  it("keeps a valid stored size when parsing and drops junk", () => {
    expect(imageSizeFields([1200, 800])).toEqual({ size: [1200, 800] });
    expect(imageSizeFields([0, 800])).toEqual({});
    expect(imageSizeFields("1200x800")).toEqual({});
    const [block] = parseContentBlocks([
      {
        id: "a",
        type: "image",
        url: "https://x.test/a.webp",
        size: [1200, 800],
      },
    ]);
    expect(block.size).toEqual([1200, 800]);
  });
});
