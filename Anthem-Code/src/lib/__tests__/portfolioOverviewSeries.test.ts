import { describe, expect, it } from "vitest";
import {
  buildPortfolioOverviewSeries,
  sumPortfolioOverviewMetric,
} from "@/lib/portfolioOverviewSeries";

describe("buildPortfolioOverviewSeries", () => {
  it("merges multiple timestamp streams into one chart series", () => {
    const from = new Date("2026-07-08T00:00:00");
    const to = new Date("2026-07-10T23:59:59");
    const series = buildPortfolioOverviewSeries(
      {
        views: ["2026-07-08T10:00:00", "2026-07-10T12:00:00"],
        followers: ["2026-07-10T15:00:00"],
        hires: [],
        collabs: [],
        works: ["2026-07-08T09:00:00"],
      },
      from,
      to,
      "day",
    );

    expect(series).toHaveLength(3);
    expect(sumPortfolioOverviewMetric(series, "views")).toBe(2);
    expect(sumPortfolioOverviewMetric(series, "followers")).toBe(1);
    expect(sumPortfolioOverviewMetric(series, "works")).toBe(1);
  });
});
