import { describe, expect, it } from "vitest";
import { normalizeReferralCode } from "@/lib/referralAttribution";

describe("normalizeReferralCode", () => {
  it("normalizes a valid affiliate code", () => {
    expect(normalizeReferralCode(" ab12cd34 ")).toBe("AB12CD34");
  });

  it("rejects short and punctuated values", () => {
    expect(normalizeReferralCode("ABC")).toBeNull();
    expect(normalizeReferralCode("ABCD-1234")).toBeNull();
  });
});
