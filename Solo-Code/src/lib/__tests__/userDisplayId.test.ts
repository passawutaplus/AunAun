import { describe, expect, it } from "vitest";
import {
  appendMemberCodeToDescription,
  formatMemberCode,
  memberCodeMatchesUserId,
  parseMemberCodeSuffix,
} from "@/lib/userDisplayId";

describe("userDisplayId", () => {
  it("formats member code from user id", () => {
    expect(formatMemberCode("aaaaaaaa-bbbb-cccc-dddd-eeff00112233")).toBe("S0112233");
    expect(formatMemberCode("00000000-0000-0000-0000-00000000a1b2")).toBe("S000A1B2");
  });

  it("parses member code suffix", () => {
    expect(parseMemberCodeSuffix("S0112233")).toBe("0112233");
    expect(parseMemberCodeSuffix("s0112233")).toBe("0112233");
    expect(parseMemberCodeSuffix("0112233")).toBe("0112233");
    expect(parseMemberCodeSuffix("S01122")).toBeNull();
    expect(parseMemberCodeSuffix("hello")).toBeNull();
  });

  it("matches user id by member code query", () => {
    const uid = "aaaaaaaa-bbbb-cccc-dddd-eeff00112233";
    expect(memberCodeMatchesUserId("S0112233", uid)).toBe(true);
    expect(memberCodeMatchesUserId("0112233", uid)).toBe(true);
    expect(memberCodeMatchesUserId("S9999999", uid)).toBe(false);
  });

  it("appends member code footer to ticket description", () => {
    const uid = "aaaaaaaa-bbbb-cccc-dddd-eeff00112233";
    expect(appendMemberCodeToDescription("มีปัญหา", uid)).toContain("รหัสสมาชิก: S0112233");
    expect(appendMemberCodeToDescription("", uid)).toBe("รหัสสมาชิก: S0112233");
    const once = appendMemberCodeToDescription("มีปัญหา", uid);
    expect(appendMemberCodeToDescription(once, uid)).toBe(once);
  });
});
