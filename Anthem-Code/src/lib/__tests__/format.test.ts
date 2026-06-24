import { describe, it, expect } from "vitest";
import { formatCompact, timeAgoTH } from "../format";

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
