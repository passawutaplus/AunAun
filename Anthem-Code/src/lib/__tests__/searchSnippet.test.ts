import { describe, expect, it } from "vitest";
import { extractSearchSnippet, tokenize } from "@/lib/highlight";
import { similarSearchSuggestions } from "@/lib/searchSuggestions";

describe("extractSearchSnippet", () => {
  it("returns excerpt around the first match", () => {
    const text = "โปสเตอร์งานเทศกาลดนตรีที่เชียงใหม่สำหรับแบรนด์ท้องถิ่น";
    expect(extractSearchSnippet(text, "เชียงใหม่")).toContain("เชียงใหม่");
    expect(extractSearchSnippet(text, "xyz")).toBeNull();
  });
});

describe("tokenize", () => {
  it("drops short tokens", () => {
    expect(tokenize("a โปสเตอร์")).toEqual(["โปสเตอร์"]);
  });
});

describe("similarSearchSuggestions", () => {
  it("suggests nearby recents and category labels", () => {
    const out = similarSearchSuggestions("grap", ["graphic poster", "food"], []);
    expect(out.some((s) => s.toLowerCase().includes("graphic"))).toBe(true);
  });
});
