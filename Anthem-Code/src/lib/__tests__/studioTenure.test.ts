import { describe, expect, it } from "vitest";
import { formatStudioJoinedDate, studioDaysOnPlatform } from "@/lib/studioTenure";

describe("studioDaysOnPlatform", () => {
  it("counts the join day as day 1", () => {
    expect(studioDaysOnPlatform("2026-08-28T03:00:00.000Z", new Date("2026-08-28T10:00:00+07:00"))).toBe(1);
  });

  it("counts inclusive calendar days in Bangkok", () => {
    // 31 Jul 17:00 UTC = 1 Aug 00:00 ICT → 1–28 Aug inclusive = 28 days
    expect(studioDaysOnPlatform("2026-07-31T17:00:00.000Z", new Date("2026-08-28T10:00:00+07:00"))).toBe(28);
  });
});

describe("formatStudioJoinedDate", () => {
  it("formats a Thai date", () => {
    const label = formatStudioJoinedDate("2026-08-01T17:00:00.000Z");
    expect(label).toMatch(/2569|2026/);
    expect(label.length).toBeGreaterThan(4);
  });
});
