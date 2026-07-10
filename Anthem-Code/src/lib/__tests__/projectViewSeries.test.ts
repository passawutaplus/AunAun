import { describe, expect, it } from "vitest";
import {
  buildProjectViewSeries,
  sumViewSeries,
  viewSeriesTrendPercent,
} from "@/lib/projectViewSeries";

describe("buildProjectViewSeries", () => {
  it("buckets views by day and fills empty days", () => {
    const from = new Date("2026-07-08T00:00:00");
    const to = new Date("2026-07-10T23:59:59");
    const series = buildProjectViewSeries(
      ["2026-07-08T10:00:00", "2026-07-10T12:00:00", "2026-07-10T18:00:00"],
      from,
      to,
      "day",
    );

    expect(series).toHaveLength(3);
    expect(sumViewSeries(series)).toBe(3);
    expect(series[0].views).toBe(1);
    expect(series[1].views).toBe(0);
    expect(series[2].views).toBe(2);
  });
});

describe("viewSeriesTrendPercent", () => {
  it("returns null when both periods are zero", () => {
    expect(viewSeriesTrendPercent(0, 0)).toBeNull();
  });

  it("computes growth against previous period", () => {
    expect(viewSeriesTrendPercent(3, 1)).toBe(200);
  });
});
