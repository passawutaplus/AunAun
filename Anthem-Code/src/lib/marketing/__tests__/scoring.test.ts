import { describe, expect, it } from "vitest";
import { computeLeadScore, scoreLeadFromFields } from "../scoring";

describe("computeLeadScore", () => {
  it("returns 100 when all factors are max", () => {
    expect(
      computeLeadScore({
        keywordMatch: 1,
        painPointMatch: 1,
        engagementScore: 1,
        recentActivity: 1,
        buyingSignal: 1,
        platformRelevance: 1,
        locationMatch: 1,
      }),
    ).toBe(100);
  });

  it("clamps low scores to 0", () => {
    expect(
      computeLeadScore({
        keywordMatch: 0,
        painPointMatch: 0,
        engagementScore: 0,
        recentActivity: 0,
        buyingSignal: 0,
        platformRelevance: 0,
        locationMatch: 0,
      }),
    ).toBe(0);
  });
});

describe("scoreLeadFromFields", () => {
  it("scores high-intent leads above weak leads", () => {
    const strong = scoreLeadFromFields({
      hasKeywordMatch: true,
      hasPainMatch: true,
      engagement: 800,
      isRecent: true,
      hasBuyingSignal: true,
    });
    const weak = scoreLeadFromFields({});
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(70);
  });
});
