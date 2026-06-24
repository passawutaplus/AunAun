import { describe, expect, it } from "vitest";
import {
  meetingDurationTier,
  meetingExtractCredits,
  meetingReportCredits,
  meetingTotalCredits,
  meetingTranscribeCredits,
} from "@/lib/meetingCredits";

describe("meetingCredits", () => {
  it("maps duration to billing tiers", () => {
    expect(meetingDurationTier(60)).toBe(15);
    expect(meetingDurationTier(15 * 60)).toBe(15);
    expect(meetingDurationTier(16 * 60)).toBe(30);
    expect(meetingDurationTier(31 * 60)).toBe(45);
    expect(meetingDurationTier(46 * 60)).toBe(60);
    expect(meetingDurationTier(90 * 60)).toBe(60);
  });

  it("charges transcribe + report credits per tier", () => {
    const sec = 10 * 60;
    expect(meetingTranscribeCredits(sec)).toBe(3);
    expect(meetingReportCredits(sec)).toBe(5);
    expect(meetingTotalCredits(sec)).toBe(8);
    expect(meetingExtractCredits(sec)).toBe(9);
  });

  it("scales credits for longer meetings", () => {
    const sec = 25 * 60;
    expect(meetingTranscribeCredits(sec)).toBe(4);
    expect(meetingReportCredits(sec)).toBe(7);
    expect(meetingTotalCredits(sec)).toBe(11);
  });
});
