import { describe, expect, it } from "vitest";
import { profileCompletion } from "@/components/onboarding/GettingStartedCard";

const empty = { hasAvatar: false, hasRole: false, bioLength: 0, skillsCount: 0, hasAvailability: false, publishedCount: 0 };

describe("profileCompletion", () => {
  it("is 0 for a brand-new account", () => {
    expect(profileCompletion(empty)).toBe(0);
  });

  it("counts the three first steps as half", () => {
    expect(profileCompletion({ ...empty, hasAvatar: true, hasRole: true, publishedCount: 1 })).toBe(50);
  });

  it("needs a real intro (20+ characters) to count the bio", () => {
    expect(profileCompletion({ ...empty, bioLength: 5 })).toBe(0);
    expect(profileCompletion({ ...empty, bioLength: 20 })).toBe(17);
  });

  it("reaches 100 when everything is filled", () => {
    expect(
      profileCompletion({ hasAvatar: true, hasRole: true, bioLength: 40, skillsCount: 3, hasAvailability: true, publishedCount: 2 }),
    ).toBe(100);
  });
});
