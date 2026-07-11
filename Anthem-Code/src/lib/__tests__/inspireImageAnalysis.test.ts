import { describe, expect, it } from "vitest";
import { analyzeInspirePalette } from "@/lib/inspireImageAnalysis";
import { hueFamily, toHexColor } from "@/lib/imagePalette";

describe("inspireImageAnalysis", () => {
  it("tags green landscape palettes with nature keywords", () => {
    const result = analyzeInspirePalette(["#1f4d2e", "#3f7a45", "#8fb86a", "#d9e6c8"]);
    expect(result.tone).toMatch(/Cool|Warm|Neutral|Soft|Deep/);
    expect(result.keywords.some((k) => k.includes("green") || k.includes("nature"))).toBe(true);
    expect(result.glance[0]).toMatch(/Nature|Foliage|Cool|Warm|Neutral/i);
    expect(result.summary.length).toBeGreaterThan(20);
  });

  it("tags dark neutral workspace palettes", () => {
    const result = analyzeInspirePalette(["#1a1a1a", "#3a3a3a", "#8a8a8a", "#e8e8e8"]);
    expect(result.keywords.some((k) => k.includes("neutral") || k.includes("monochrome"))).toBe(
      true,
    );
  });

  it("maps hue families correctly", () => {
    expect(hueFamily("#2d6a4f")).toBe("green");
    expect(hueFamily("#1d4e89")).toBe("blue");
    expect(hueFamily("#c1121f")).toBe("red");
    expect(hueFamily(toHexColor("rgb(120 120 120)"))).toBe("neutral");
  });
});
