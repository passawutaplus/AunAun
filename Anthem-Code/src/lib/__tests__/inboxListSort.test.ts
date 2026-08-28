import { describe, expect, it } from "vitest";
import {
  inboxDeadlineTime,
  inboxPriorityRank,
  inboxStatusOrderRank,
  sortInboxRows,
} from "@/lib/inboxListSort";

describe("inboxDeadlineTime", () => {
  it("puts missing dates last", () => {
    expect(inboxDeadlineTime(null)).toBe(Number.POSITIVE_INFINITY);
    expect(inboxDeadlineTime("2026-07-23")).toBeLessThan(inboxDeadlineTime("2026-08-01"));
  });
});

describe("inboxPriorityRank", () => {
  it("orders ด่วน before ปกติ before รอได้", () => {
    expect(inboxPriorityRank("ด่วน")).toBeLessThan(inboxPriorityRank("ปกติ"));
    expect(inboxPriorityRank("ปกติ")).toBeLessThan(inboxPriorityRank("รอได้"));
  });
});

describe("sortInboxRows", () => {
  const rows = [
    { id: "a", deadline: "2026-08-01", priority: "ปกติ", statusRank: 2, createdAt: "2026-01-03" },
    { id: "b", deadline: "2026-07-23", priority: "ด่วน", statusRank: 1, createdAt: "2026-01-01" },
    { id: "c", deadline: null, priority: "รอได้", statusRank: 0, createdAt: "2026-01-02" },
  ];
  const pick = (r: (typeof rows)[number]) => r;

  it("sorts by soonest deadline", () => {
    expect(sortInboxRows(rows, "deadline", pick).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by priority with ด่วน first", () => {
    expect(sortInboxRows(rows, "priority", pick).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by status rank", () => {
    expect(sortInboxRows(rows, "status", pick).map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
});

describe("inboxStatusOrderRank", () => {
  it("uses list order", () => {
    expect(inboxStatusOrderRank("ตอบรับ", ["ติดต่อใหม่", "ตอบรับ"])).toBe(1);
    expect(inboxStatusOrderRank("ไม่มี", ["ติดต่อใหม่"])).toBe(1);
  });
});
