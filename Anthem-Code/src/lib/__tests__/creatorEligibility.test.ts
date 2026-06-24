import { describe, expect, it } from "vitest";
import { computeCreatorEligibility, WELCOME_PX_CAP } from "@/lib/creatorEligibility";

describe("computeCreatorEligibility", () => {
  it("locks receive until welcome and published work", () => {
    const r = computeCreatorEligibility({
      welcomeClaimedPx: 100,
      publishedCount: 0,
      followerCount: 0,
      isVerified: false,
    });
    expect(r.canReceiveGifts).toBe(false);
    expect(r.tier).toBe("locked");
  });

  it("allows receive after welcome cap and published project", () => {
    const r = computeCreatorEligibility({
      welcomeClaimedPx: WELCOME_PX_CAP,
      publishedCount: 1,
      followerCount: 0,
      isVerified: false,
    });
    expect(r.canReceiveGifts).toBe(true);
    expect(r.canCashout).toBe(false);
    expect(r.tier).toBe("receive");
  });

  it("allows cashout when followers and kyc complete", () => {
    const r = computeCreatorEligibility({
      welcomeClaimedPx: WELCOME_PX_CAP,
      publishedCount: 2,
      followerCount: 15,
      isVerified: true,
    });
    expect(r.canCashout).toBe(true);
    expect(r.tier).toBe("cashout");
  });
});
