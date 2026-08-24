import { describe, it, expect } from "vitest";
import { formatCompact, timeAgoTH, formatDesignerPresence } from "../format";

describe("formatCompact", () => {
  it("formats thousands and millions", () => {
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(1_000)).toBe("1k");
    expect(formatCompact(1_500)).toBe("1.5k");
    expect(formatCompact(1_000_000)).toBe("1m");
    expect(formatCompact(2_300_000)).toBe("2.3m");
  });
  it("handles zero / null-like", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(undefined as unknown as number)).toBe("0");
  });
});

describe("timeAgoTH", () => {
  it("returns 'เมื่อสักครู่' for now", () => {
    expect(timeAgoTH(new Date().toISOString())).toBe("เมื่อสักครู่");
  });
  it("returns minutes for recent past", () => {
    const t = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgoTH(t)).toMatch(/นาทีก่อน/);
  });
  it("returns hours", () => {
    const t = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(timeAgoTH(t)).toMatch(/ชั่วโมงก่อน/);
  });
});

describe("formatDesignerPresence", () => {
  const now = Date.parse("2026-08-24T06:00:00.000Z");

  it("returns null when missing", () => {
    expect(formatDesignerPresence(null, now)).toBeNull();
    expect(formatDesignerPresence(undefined, now)).toBeNull();
  });
  it("returns ACTIVE NOW when seen within 5 minutes", () => {
    expect(formatDesignerPresence(new Date(now - 2 * 60_000).toISOString(), now)).toEqual({
      live: true,
      label: "ACTIVE NOW",
    });
  });
  it("returns minutes when recently left", () => {
    expect(formatDesignerPresence(new Date(now - 12 * 60_000).toISOString(), now)).toEqual({
      live: false,
      label: "ACTIVE 12 MIN AGO",
    });
  });
  it("returns hours", () => {
    expect(formatDesignerPresence(new Date(now - 3 * 3_600_000).toISOString(), now)).toEqual({
      live: false,
      label: "ACTIVE 3 HOURS AGO",
    });
  });
  it("returns singular hour and day", () => {
    expect(formatDesignerPresence(new Date(now - 1 * 3_600_000).toISOString(), now)).toEqual({
      live: false,
      label: "ACTIVE 1 HOUR AGO",
    });
    expect(formatDesignerPresence(new Date(now - 26 * 3_600_000).toISOString(), now)).toEqual({
      live: false,
      label: "ACTIVE 1 DAY AGO",
    });
  });
  it("returns days", () => {
    expect(formatDesignerPresence(new Date(now - 3 * 24 * 3_600_000).toISOString(), now)).toEqual({
      live: false,
      label: "ACTIVE 3 DAYS AGO",
    });
  });
});
