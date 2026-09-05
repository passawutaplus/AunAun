import { describe, expect, it } from "vitest";
import {
  AD_CUSTOM_MAX_DAYS,
  AD_CUSTOM_MAX_THB,
  AD_CUSTOM_MIN_DAYS,
  AD_CUSTOM_MIN_THB,
  clampAdCustomAmount,
  clampAdCustomDays,
  estimateAdImpressions,
  formatAdEstimateRange,
} from "@/lib/adEstimate";

describe("estimateAdImpressions", () => {
  it("matches Standard package mid (~10,000 at ฿2,490)", () => {
    const est = estimateAdImpressions(2_490, 14);
    expect(est.mid).toBe(9_960);
    expect(est.low).toBe(7_968);
    expect(est.high).toBe(11_952);
    expect(est.dailyMid).toBe(711);
  });

  it("scales with budget, not just days", () => {
    const cheap = estimateAdImpressions(500, 7);
    const spendy = estimateAdImpressions(5_000, 7);
    expect(spendy.mid).toBeGreaterThan(cheap.mid * 5);
  });

  it("clamps out-of-range inputs", () => {
    expect(clampAdCustomAmount(10)).toBe(AD_CUSTOM_MIN_THB);
    expect(clampAdCustomAmount(999_999)).toBe(AD_CUSTOM_MAX_THB);
    expect(clampAdCustomDays(0)).toBe(AD_CUSTOM_MIN_DAYS);
    expect(clampAdCustomDays(400)).toBe(AD_CUSTOM_MAX_DAYS);
  });

  it("formats a Thai range", () => {
    expect(formatAdEstimateRange(6400, 9600)).toBe("6,400 – 9,600");
  });
});
