import { describe, expect, it } from "vitest";
import {
  buildHireInboxSeries,
  extractCollabInboxTimestamps,
  extractHireInboxTimestamps,
  previousRangeBounds,
  sumInboxMetric,
  timestampsInRange,
} from "@/lib/inboxOverviewSeries";

describe("inboxOverviewSeries", () => {
  it("splits hire rows into request / origin / status streams", () => {
    const stamps = extractHireInboxTimestamps([
      { created_at: "2026-07-08T10:00:00", status: "ใหม่", service_id: null },
      { created_at: "2026-07-09T10:00:00", status: "ตอบรับ", service_id: "svc-1", updated_at: "2026-07-10T08:00:00" },
      { created_at: "2026-07-10T10:00:00", status: "ปิดแล้ว", updated_at: "2026-07-11T08:00:00" },
    ]);
    expect(stamps.requests).toHaveLength(3);
    expect(stamps.fromPackage).toEqual(["2026-07-09T10:00:00"]);
    expect(stamps.fromProject).toHaveLength(2);
    expect(stamps.accepted).toEqual(["2026-07-10T08:00:00"]);
    expect(stamps.completed).toEqual(["2026-07-11T08:00:00"]);
  });

  it("splits collab rows into request / accepted / completed streams", () => {
    const stamps = extractCollabInboxTimestamps([
      { created_at: "2026-07-08T10:00:00", status: "pending" },
      { created_at: "2026-07-09T10:00:00", status: "accepted", updated_at: "2026-07-10T08:00:00" },
      { created_at: "2026-07-10T10:00:00", status: "completed", updated_at: "2026-07-11T08:00:00" },
    ]);
    expect(stamps.requests).toHaveLength(3);
    expect(stamps.accepted).toEqual(["2026-07-10T08:00:00"]);
    expect(stamps.completed).toEqual(["2026-07-11T08:00:00"]);
  });

  it("builds a daily hire series", () => {
    const from = new Date("2026-07-08T00:00:00");
    const to = new Date("2026-07-10T23:59:59");
    const series = buildHireInboxSeries(
      {
        requests: ["2026-07-08T10:00:00", "2026-07-10T12:00:00"],
        fromProject: ["2026-07-08T10:00:00"],
        fromPackage: ["2026-07-10T12:00:00"],
        accepted: [],
        completed: [],
      },
      from,
      to,
      "day",
    );
    expect(series).toHaveLength(3);
    expect(sumInboxMetric(series, "requests")).toBe(2);
    expect(sumInboxMetric(series, "fromPackage")).toBe(1);
  });

  it("filters timestamps and previous range", () => {
    const from = new Date("2026-07-10T00:00:00");
    const to = new Date("2026-07-12T23:59:59");
    expect(timestampsInRange(["2026-07-09T12:00:00", "2026-07-11T12:00:00"], from, to)).toEqual([
      "2026-07-11T12:00:00",
    ]);
    expect(timestampsInRange(undefined, from, to)).toEqual([]);
    const prev = previousRangeBounds(from, to);
    expect(prev.to.getTime()).toBe(from.getTime() - 1);
  });
});
