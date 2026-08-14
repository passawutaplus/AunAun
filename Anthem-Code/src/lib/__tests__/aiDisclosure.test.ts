import { describe, expect, it } from "vitest";
import { parseAiUseLevel, projectHasAiTag, serializeAiUseLevel } from "@/lib/aiDisclosure";

describe("parseAiUseLevel", () => {
  it("returns null when not assisted", () => {
    expect(parseAiUseLevel("full", false)).toBeNull();
    expect(parseAiUseLevel("", false)).toBeNull();
  });

  it("reads stored level keys", () => {
    expect(parseAiUseLevel("assist", true)).toBe("assist");
    expect(parseAiUseLevel("partial", true)).toBe("partial");
    expect(parseAiUseLevel("full", true)).toBe("full");
  });

  it("maps legacy free-text to partial", () => {
    expect(parseAiUseLevel("Midjourney แล้วปรับเอง", true)).toBe("partial");
  });

  it("defaults empty assisted note to assist", () => {
    expect(parseAiUseLevel("", true)).toBe("assist");
    expect(parseAiUseLevel(null, true)).toBe("assist");
  });
});

describe("projectHasAiTag", () => {
  it("hides works with the AI disclosure flag", () => {
    expect(projectHasAiTag({ aiAssisted: true })).toBe(true);
    expect(projectHasAiTag({ ai_assisted: true })).toBe(true);
  });

  it("hides works tagged catsub:ai", () => {
    expect(projectHasAiTag({ tags: ["catsub:ai"] })).toBe(true);
    expect(projectHasAiTag({ tags: ["AI"] })).toBe(true);
  });

  it("keeps works without AI disclosure or tag", () => {
    expect(projectHasAiTag({ aiAssisted: false, tags: ["logo"] })).toBe(false);
  });
});

describe("serializeAiUseLevel", () => {
  it("clears note when disabled", () => {
    expect(serializeAiUseLevel(false, "full")).toBe("");
  });

  it("stores the selected level", () => {
    expect(serializeAiUseLevel(true, "partial")).toBe("partial");
  });
});
