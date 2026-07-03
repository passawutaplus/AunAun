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
      behaviorCategories: ["Graphic / Branding"],
      feedInterests: ["UI/UX"],
      searchCategoryWeights: {},
    });
    expect(weights["Graphic / Branding"]).toBe(1);
    expect(weights["UI/UX"]).toBe(3);
  });

  it("adds search signal weight", () => {
    const weights = buildCategoryWeights({
      behaviorCategories: [],
      feedInterests: [],
      searchCategoryWeights: { "Illustration / Art": 2 },
    });
    expect(weights["Illustration / Art"]).toBe(4);
  });
});

describe("resolveTopCategories", () => {
  it("cold-starts from feed interests when no behavior", () => {
    expect(
      resolveTopCategories({
        behaviorCategories: [],
        feedInterests: ["UI/UX", "Graphic / Branding"],
        searchCategoryWeights: {},
      }),
    ).toEqual(["UI/UX", "Graphic / Branding"]);
  });

  it("prefers higher-weight behavior over interests", () => {
    const top = resolveTopCategories({
      behaviorCategories: ["Graphic / Branding", "Graphic / Branding", "Graphic / Branding", "Graphic / Branding"],
      feedInterests: ["UI/UX"],
      searchCategoryWeights: {},
    });
    expect(top[0]).toBe("Graphic / Branding");
  });

  it("boosts categories from search", () => {
    const top = pickTopCategories(
      buildCategoryWeights({
        behaviorCategories: ["Graphic / Branding"],
        feedInterests: [],
        searchCategoryWeights: { "UI/UX": 3 },
      }),
      [],
    );
    expect(top).toContain("UI/UX");
  });
});

describe("mapSearchQueryToCategories", () => {
  it("maps ux alias to UI/UX", () => {
    expect(mapSearchQueryToCategories("ux portfolio")).toContain("UI/UX");
  });

  it("maps logo to Graphic / Branding", () => {
    expect(mapSearchQueryToCategories("logo design")).toContain("Graphic / Branding");
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
