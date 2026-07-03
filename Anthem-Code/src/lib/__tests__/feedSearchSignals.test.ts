import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getFeedSearchCategoryWeights,
  getFeedSearchQueries,
  recordFeedSearch,
} from "@/lib/feedSearchSignals";
import { mapSearchQueryToCategories } from "@/lib/forYouBlend";

describe("feedSearchSignals", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
  });

  it("records and dedupes queries", () => {
    recordFeedSearch("user-1", "logo design");
    recordFeedSearch("user-1", "figma ui");
    recordFeedSearch("user-1", "logo design");
    const queries = getFeedSearchQueries("user-1");
    expect(queries).toEqual(["figma ui", "logo design"]);
  });

  it("maps recorded queries to category weights", () => {
    recordFeedSearch("user-2", "ux app");
    const weights = getFeedSearchCategoryWeights("user-2");
    expect(weights["UI/UX"]).toBeGreaterThan(0);
  });
});

describe("mapSearchQueryToCategories export", () => {
  it("re-exports from forYouBlend", () => {
    expect(mapSearchQueryToCategories("motion graphics")).toContain("Motion / Animation");
  });
});
