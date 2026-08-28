import { describe, expect, it } from "vitest";
import {
  COLLAB_INBOX_SORT_OPTIONS,
  compareInboxSortRows,
  deadlineSortMs,
  inboxPriorityRank,
  sortInboxRows,
} from "@/lib/inboxSort";

describe("deadlineSortMs", () => {
  it("parses ISO dates and puts empty last", () => {
    expect(deadlineSortMs("2026-07-23")).toBeLessThan(deadlineSortMs("2026-08-01"));
    expect(deadlineSortMs(null)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("inboxPriorityRank", () => {
  it("puts ด่วน before รอได้ before ปกติ", () => {
    expect(inboxPriorityRank("ด่วน")).toBeLessThan(inboxPriorityRank("รอได้"));
    expect(inboxPriorityRank("รอได้")).toBeLessThan(inboxPriorityRank("ปกติ"));
  });
});

describe("sortInboxRows", () => {
  it("defaults to latest request first", () => {
    const rows = [
      { id: "old", createdAt: "2026-01-01" },
      { id: "new", createdAt: "2026-02-01" },
    ];
    expect(
      sortInboxRows(rows, "latest", (r) => ({
        statusRank: 0,
        createdAt: r.createdAt,
      })).map((r) => r.id),
    ).toEqual(["new", "old"]);
  });

  it("sorts deadline earliest first", () => {
    const rows = [
      { id: "b", deadlineRaw: "2026-08-01", createdAt: "2026-01-02" },
      { id: "a", deadlineRaw: "2026-07-01", createdAt: "2026-01-01" },
    ];
    expect(
      sortInboxRows(rows, "deadline_asc", (r) => ({
        deadlineRaw: r.deadlineRaw,
        statusRank: 0,
        createdAt: r.createdAt,
      })).map((r) => r.id),
    ).toEqual(["a", "b"]);
  });

  it("sorts deadline latest first and keeps empty last", () => {
    const rows = [
      { id: "early", deadlineRaw: "2026-07-01" },
      { id: "none", deadlineRaw: null },
      { id: "late", deadlineRaw: "2026-09-01" },
    ];
    expect(
      sortInboxRows(rows, "deadline_desc", (r) => ({
        deadlineRaw: r.deadlineRaw,
        statusRank: 0,
      })).map((r) => r.id),
    ).toEqual(["late", "early", "none"]);
  });

  it("sorts urgent priority first", () => {
    const rows = [
      { id: "n", priority: "ปกติ", statusRank: 0 },
      { id: "u", priority: "ด่วน", statusRank: 0 },
    ];
    expect(
      sortInboxRows(rows, "priority", (r) => ({
        priority: r.priority,
        statusRank: r.statusRank,
      })).map((r) => r.id),
    ).toEqual(["u", "n"]);
  });
});

describe("compareInboxSortRows", () => {
  it("sorts status rank ascending", () => {
    expect(
      compareInboxSortRows(
        { statusRank: 2, createdAt: "2026-01-01" },
        { statusRank: 0, createdAt: "2026-01-01" },
        "status",
      ),
    ).toBeGreaterThan(0);
  });
});

describe("COLLAB_INBOX_SORT_OPTIONS", () => {
  it("uses period, status, and priority — not hire deadlines", () => {
    expect(COLLAB_INBOX_SORT_OPTIONS.map((o) => o.label)).toEqual([
      "ช่วงเวลา",
      "สถานะ",
      "ความสำคัญ",
    ]);
  });
});
