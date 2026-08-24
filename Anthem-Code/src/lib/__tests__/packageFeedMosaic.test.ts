import { describe, expect, it } from "vitest";
import { buildPackageMosaic } from "@/lib/packageFeedMosaic";

const svc = (
  id: string,
  cover: string | null,
  gallery: string[],
  sort = 0,
): Parameters<typeof buildPackageMosaic>[0][number] => ({
  id,
  title: `Pkg ${id}`,
  cover_url: cover,
  gallery_urls: gallery,
  sort_order: sort,
  updated_at: "2026-08-01T00:00:00Z",
});

describe("buildPackageMosaic", () => {
  it("puts each package cover before its gallery, in sort order", () => {
    const tiles = buildPackageMosaic([
      svc("b", "b-cover.jpg", ["b-g1.jpg"], 1),
      svc("a", "a-cover.jpg", ["a-g1.jpg"], 0),
    ]);
    expect(tiles.map((t) => t.url)).toEqual([
      "a-cover.jpg",
      "a-g1.jpg",
      "b-cover.jpg",
      "b-g1.jpg",
    ]);
    expect(tiles[0]?.serviceId).toBe("a");
    expect(tiles[2]?.serviceId).toBe("b");
  });

  it("dedupes URLs and fills from a single package gallery", () => {
    const tiles = buildPackageMosaic([
      svc("only", "same.jpg", ["same.jpg", "extra.jpg"]),
    ]);
    expect(tiles.map((t) => t.url)).toEqual(["same.jpg", "extra.jpg"]);
  });

  it("caps tile count", () => {
    const tiles = buildPackageMosaic(
      [svc("a", "c.jpg", ["1.jpg", "2.jpg", "3.jpg"])],
      2,
    );
    expect(tiles).toHaveLength(2);
  });
});
