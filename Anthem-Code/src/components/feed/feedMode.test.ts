import { describe, expect, it } from "vitest";
import { parseFeedMode } from "./FeedModeToggle";

describe("parseFeedMode", () => {
  it("accepts current ids", () => {
    expect(parseFeedMode("showcase")).toBe("showcase");
    expect(parseFeedMode("creators")).toBe("creators");
    expect(parseFeedMode("packages")).toBe("packages");
  });

  it("maps pre-rename ids from old links and storage", () => {
    expect(parseFeedMode("projects")).toBe("showcase");
    expect(parseFeedMode("designers")).toBe("creators");
  });

  it("rejects unknown or empty values", () => {
    expect(parseFeedMode("drill")).toBeNull();
    expect(parseFeedMode("")).toBeNull();
    expect(parseFeedMode(null)).toBeNull();
  });
});
