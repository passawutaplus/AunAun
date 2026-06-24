import { describe, expect, it } from "vitest";
import {
  blendPersonalizedProjects,
  buildCategoryWeights,
  mapSearchQueryToCategories,
  pickTopCategories,
  resolveTopCategories,
} from "@/lib/forYouBlend";

describe("buildCategoryWeights", () => {
  it("weights behavior lower than survey interests", () => {
    const weights = buildCategoryWeights({
      behaviorCategories: ["Graphic"],
      feedInterests: ["Web/UI"],
      searchCategoryWeights: {},
    });
    expect(weights["Graphic"]).toBe(1);
    expect(weights["Web/UI"]).toBe(3);
  });

  it("adds search signal weight", () => {
    const weights = buildCategoryWeights({
      behaviorCategories: [],
      feedInterests: [],
      searchCategoryWeights: { Illustration: 2 },
    });
    expect(weights["Illustration"]).toBe(4);
  });
});

describe("resolveTopCategories", () => {
  it("cold-starts from feed interests when no behavior", () => {
    expect(
      resolveTopCategories({
        behaviorCategories: [],
        feedInterests: ["Web/UI", "Graphic"],
        searchCategoryWeights: {},
      }),
    ).toEqual(["Web/UI", "Graphic"]);
  });

  it("prefers higher-weight behavior over interests", () => {
    const top = resolveTopCategories({
      behaviorCategories: ["Graphic", "Graphic", "Graphic", "Graphic"],
      feedInterests: ["Web/UI"],
      searchCategoryWeights: {},
    });
    expect(top[0]).toBe("Graphic");
  });

  it("boosts categories from search", () => {
    const top = pickTopCategories(
      buildCategoryWeights({
        behaviorCategories: ["Graphic"],
        feedInterests: [],
        searchCategoryWeights: { "Web/UI": 3 },
      }),
      [],
    );
    expect(top).toContain("Web/UI");
  });
});

describe("mapSearchQueryToCategories", () => {
  it("maps ux alias to Web/UI", () => {
    expect(mapSearchQueryToCategories("ux portfolio")).toContain("Web/UI");
  });

  it("maps logo to Graphic", () => {
    expect(mapSearchQueryToCategories("logo design")).toContain("Graphic");
  });
});

describe("blendPersonalizedProjects", () => {
  it("dedupes and pushes seen to bottom", () => {
    const ai = [{ id: "a" }, { id: "b" }];
    const cat = [{ id: "b" }, { id: "c" }];
    const seen = new Set(["a"]);
    const out = blendPersonalizedProjects(ai, cat, seen);
    expect(out.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
});
