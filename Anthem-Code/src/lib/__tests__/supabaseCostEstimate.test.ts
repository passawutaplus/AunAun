import { describe, expect, it } from "vitest";
import { estimateSupabaseMonthlyCost } from "@/lib/supabaseCostEstimate";

describe("estimateSupabaseMonthlyCost", () => {
  it("marks free plan under limit as ok", () => {
    const e = estimateSupabaseMonthlyCost({
      planLabel: "Free",
      storageBytes: 100 * 1024 ** 2,
      dbBytes: 100 * 1024 ** 2,
    });
    expect(e.status).toBe("ok");
    expect(e.baseUsd).toBe(0);
    expect(e.estimatedMonthlyUsd).toBe(0);
  });

  it("flags overage on pro and adds storage cost", () => {
    const e = estimateSupabaseMonthlyCost({
      planLabel: "Pro",
      storageBytes: 110 * 1024 ** 3,
      dbBytes: 8 * 1024 ** 3,
      storageLimitGb: 100,
      dbLimitGb: 8,
    });
    expect(e.status).toBe("over");
    expect(e.storageOverageGb).toBeCloseTo(10, 5);
    expect(e.estimatedMonthlyUsd).toBeGreaterThan(25);
    expect(e.estimatedMonthlyThb).toBeGreaterThan(e.estimatedMonthlyUsd);
  });
});
