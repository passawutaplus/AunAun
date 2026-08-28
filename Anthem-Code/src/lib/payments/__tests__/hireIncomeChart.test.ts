import { describe, expect, it } from "vitest";
import { seedHireWalletPreview } from "@/lib/payments/hireWallet";
import { buildHireIncomeWeekSeries, hireIncomeYearSatang } from "@/lib/payments/hireIncomeChart";
import { thbToSatang } from "@/lib/payments/fees";

describe("hire income week series", () => {
  it("buckets preview jobs into Bangkok weeks", () => {
    const seed = seedHireWalletPreview();
    const series = buildHireIncomeWeekSeries(seed.income, {
      now: new Date("2026-08-27T13:00:00+07:00"),
      weekCount: 8,
    });
    expect(series).toHaveLength(8);
    const withJobs = series.filter((row) => row.count > 0);
    expect(withJobs).toHaveLength(3);
    const totalRevenue = series.reduce((s, row) => s + row.revenueSatang, 0);
    expect(totalRevenue).toBe(thbToSatang(43_000));
  });

  it("sums a tax year from occurredAt", () => {
    const seed = seedHireWalletPreview();
    const year = hireIncomeYearSatang(seed.income, 2026);
    expect(year.count).toBe(5);
    expect(year.revenueSatang).toBe(thbToSatang(43_000));
    expect(year.whtSatang).toBe(thbToSatang(405));
    expect(hireIncomeYearSatang(seed.income, 2025).count).toBe(0);
  });
});
