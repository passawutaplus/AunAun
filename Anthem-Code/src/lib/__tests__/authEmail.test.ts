import { describe, expect, it } from "vitest";
import { isEmailVerifiedForAccess } from "../authEmail";

type U = Parameters<typeof isEmailVerifiedForAccess>[0];
const user = (provider: string, confirmed: string | null = null): U =>
  ({
    email_confirmed_at: confirmed ?? undefined,
    identities: [{ provider }],
    app_metadata: { provider, providers: [provider] },
  }) as unknown as U;

describe("isEmailVerifiedForAccess", () => {
  it("lets social sign-ins in without the e-mail link step", () => {
    for (const p of ["google", "apple", "facebook", "custom:line"]) {
      expect(isEmailVerifiedForAccess(user(p))).toBe(true);
    }
  });

  it("still asks e-mail sign-ups to confirm their address", () => {
    expect(isEmailVerifiedForAccess(user("email"))).toBe(false);
    expect(isEmailVerifiedForAccess(user("email", "2026-11-23T00:00:00Z"))).toBe(true);
    expect(isEmailVerifiedForAccess(null)).toBe(false);
  });
});
