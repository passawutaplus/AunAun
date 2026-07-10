import { describe, expect, it } from "vitest";
import {
  getProjectStatsRangeBounds,
  projectStatsRangeLabel,
  type ProjectStatsDateRange,
} from "@/lib/projectStatsDateRange";
import { EMPTY_PROJECT_STATS, EMPTY_PROJECT_STATS_IN_RANGE } from "@/hooks/usePortfolioProjectStats";

describe("projectStatsDateRange", () => {
  it("builds preset bounds including today", () => {
    const bounds = getProjectStatsRangeBounds({ preset: "today" });
    expect(bounds).not.toBeNull();
    expect(bounds!.from <= bounds!.to).toBe(true);
  });

  it("rejects invalid custom ranges", () => {
    expect(
      getProjectStatsRangeBounds({
        preset: "custom",
        customFrom: "2026-07-10",
        customTo: "2026-07-01",
      }),
    ).toBeNull();
  });

  it("labels custom range in Thai", () => {
    const range: ProjectStatsDateRange = {
      preset: "custom",
      customFrom: "2026-07-01",
      customTo: "2026-07-10",
    };
    const bounds = getProjectStatsRangeBounds(range);
    expect(projectStatsRangeLabel(range, bounds)).toContain("–");
  });
});

describe("EMPTY_PROJECT_STATS", () => {
  it("has zero defaults for batch counters", () => {
    expect(EMPTY_PROJECT_STATS).toEqual({
      views7d: 0,
      views30d: 0,
      hireCount: 0,
      collabCount: 0,
      bookmarkCount: 0,
      collectionSaveCount: 0,
      commentCount: 0,
    });
  });
});

describe("EMPTY_PROJECT_STATS_IN_RANGE", () => {
  it("has zero defaults for ranged counters", () => {
    expect(EMPTY_PROJECT_STATS_IN_RANGE).toEqual({
      viewCount: 0,
      hireCount: 0,
      collabCount: 0,
      bookmarkCount: 0,
      collectionSaveCount: 0,
      commentCount: 0,
    });
  });
});
