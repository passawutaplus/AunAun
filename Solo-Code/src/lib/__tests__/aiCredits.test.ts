import { describe, expect, it } from "vitest";
import {
  creditAiBarSegments,
  creditAiTotalCapacity,
  poolRemainingFromSummary,
} from "@/lib/aiCredits";

describe("creditAiBarSegments", () => {
  it("daily only — full yellow bar", () => {
    const r = creditAiBarSegments({
      dailyRemaining: 5,
      dailyLimit: 5,
      poolRemaining: 0,
      poolCapacity: 0,
    });
    expect(r.dailyPct).toBe(100);
    expect(r.poolPct).toBe(0);
  });

  it("pool only — primary segment", () => {
    const r = creditAiBarSegments({
      dailyRemaining: 0,
      dailyLimit: 5,
      poolRemaining: 800,
      poolCapacity: 800,
    });
    expect(r.dailyPct).toBe(0);
    expect(r.poolPct).toBe(99.38);
  });

  it("both layers — daily left of pool", () => {
    const r = creditAiBarSegments({
      dailyRemaining: 3,
      dailyLimit: 5,
      poolRemaining: 100,
      poolCapacity: 800,
    });
    expect(r.dailyPct).toBeGreaterThan(0);
    expect(r.poolPct).toBeGreaterThan(0);
    expect(r.dailyPct + r.poolPct).toBeLessThanOrEqual(100);
  });

  it("empty — no colored segments", () => {
    const r = creditAiBarSegments({
      dailyRemaining: 0,
      dailyLimit: 5,
      poolRemaining: 0,
      poolCapacity: 800,
    });
    expect(r.dailyPct).toBe(0);
    expect(r.poolPct).toBe(0);
  });
});

describe("creditAiTotalCapacity", () => {
  it("sums daily limit and pool capacity", () => {
    expect(
      creditAiTotalCapacity({
        dailyRemaining: 2,
        dailyLimit: 5,
        poolRemaining: 100,
        poolCapacity: 800,
      }),
    ).toBe(805);
  });
});

describe("poolRemainingFromSummary", () => {
  it("adds included and purchased", () => {
    expect(
      poolRemainingFromSummary({ included_remaining: 10, purchased_balance: 5 }),
    ).toBe(15);
  });
});
