import { describe, expect, it } from "vitest";
import {
  rankDesignersForYou,
  rankDesignersNewest,
  scoreDesignerInterest,
} from "@/lib/designerFeedRank";
import type { DesignerCardData } from "@/data/designerTypes";

const make = (
  id: string,
  opts: { created_at?: string; categories?: string[]; skills?: string[] } = {},
): DesignerCardData =>
  ({
    profile: {
      id,
      user_id: id,
      display_name: id,
      skills: opts.skills ?? [],
      created_at: opts.created_at ?? "2026-01-01T00:00:00Z",
    },
    projects: (opts.categories ?? []).map((category, i) => ({
      id: `${id}-p${i}`,
      category,
      owner_id: id,
      views: 0,
      created_at: opts.created_at ?? "2026-01-01T00:00:00Z",
    })),
    searchHaystack: id,
  }) as unknown as DesignerCardData;

describe("designerFeedRank", () => {
  it("scores interest matches from project categories", () => {
    const d = make("a", { categories: ["UI/UX", "Photography"] });
    expect(scoreDesignerInterest(d, ["UI/UX"])).toBe(3);
    expect(scoreDesignerInterest(d, ["UI/UX", "Photography"])).toBe(6);
    expect(scoreDesignerInterest(d, [])).toBe(0);
  });

  it("ranks for-you by interest score first", () => {
    const low = make("low", { categories: ["Photography"] });
    const high = make("high", { categories: ["UI/UX", "UI/UX"] });
    const ranked = rankDesignersForYou([low, high], ["UI/UX"]);
    expect(ranked[0].profile.id).toBe("high");
  });

  it("ranks newest by profile created_at desc", () => {
    const old = make("old", { created_at: "2025-01-01T00:00:00Z" });
    const neu = make("new", { created_at: "2026-06-01T00:00:00Z" });
    const ranked = rankDesignersNewest([old, neu]);
    expect(ranked.map((d) => d.profile.id)).toEqual(["new", "old"]);
  });
});
