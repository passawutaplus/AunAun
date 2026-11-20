import { describe, expect, it } from "vitest";
import { computeActivation, coreProfileComplete, type SignupRow } from "../activation";

const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const BIO = "ออกแบบแพ็กเกจจิ้งให้แบรนด์อาหารไทย";

const full = (id: string, signedUpDaysAgo: number): SignupRow => ({
  user_id: id,
  created_at: daysAgo(signedUpDaysAgo),
  avatar_url: "https://x/a.jpg",
  role: "Graphic designer",
  bio: BIO,
  skills: [],
});

describe("activation funnel (north-star)", () => {
  it("core profile needs photo + role or skills + bio ≥ 20", () => {
    expect(coreProfileComplete(full("a", 1))).toBe(true);
    expect(coreProfileComplete({ ...full("a", 1), avatar_url: null })).toBe(false);
    expect(coreProfileComplete({ ...full("a", 1), role: "", skills: ["3D"] })).toBe(true);
    expect(coreProfileComplete({ ...full("a", 1), bio: "สั้นไป" })).toBe(false);
  });

  it("counts signup → profile → first project within 7 days", () => {
    const signups: SignupRow[] = [
      full("a", 6), // publishes 2 days after signup → activated
      full("b", 5), // complete profile, no project
      { ...full("c", 4), avatar_url: null }, // project but incomplete profile → not activated
      full("d", 10), // outside the 7-day cohort
      { ...full("e", 2), user_id: null }, // broken row ignored
    ];
    const projects = [
      { owner_id: "a", created_at: daysAgo(4) },
      { owner_id: "a", created_at: daysAgo(1) },
      { owner_id: "c", created_at: daysAgo(3) },
      { owner_id: "d", created_at: daysAgo(9) },
    ];
    const f = computeActivation(signups, projects, NOW);
    expect(f).toMatchObject({ signups: 3, profileCompleted: 2, activated: 1, stillOpen: 3, directional: true });
  });

  it("a first project later than 7 days after signup does not count", () => {
    const f = computeActivation([full("a", 20)], [{ owner_id: "a", created_at: daysAgo(5) }], NOW, 30);
    expect(f.activated).toBe(0);
    expect(f.stillOpen).toBe(0);
  });

  it("empty data is zero, not a guess", () => {
    expect(computeActivation([], [], NOW)).toMatchObject({ signups: 0, activated: 0, directional: true });
  });
});
