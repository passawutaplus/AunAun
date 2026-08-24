import { describe, expect, it } from "vitest";
import { packageDetailTags, packageTagFeedUrl } from "@/lib/packageRoutes";

describe("packageRoutes", () => {
  it("builds packages feed url with q", () => {
    expect(packageTagFeedUrl("character")).toBe("/?mode=packages&q=character");
    expect(packageTagFeedUrl("#3D")).toBe("/?mode=packages&q=3D");
    expect(packageTagFeedUrl("  ")).toBe("/?mode=packages");
  });

  it("lists parent + tags without catsub", () => {
    expect(packageDetailTags("3D / CG / Game", ["character", "catsub:cg"])).toEqual([
      "3D",
      "character",
    ]);
  });
});
