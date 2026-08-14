import { describe, expect, it } from "vitest";
import { parseAiUseLevel, serializeAiUseLevel } from "@/lib/aiDisclosure";

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

describe("serializeAiUseLevel", () => {
  it("clears note when disabled", () => {
    expect(serializeAiUseLevel(false, "full")).toBe("");
  });

  it("stores the selected level", () => {
    expect(serializeAiUseLevel(true, "partial")).toBe("partial");
  });
});
