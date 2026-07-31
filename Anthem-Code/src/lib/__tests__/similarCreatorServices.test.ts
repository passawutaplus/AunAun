import { describe, expect, it } from "vitest";
import {
  pickSimilarCreatorServices,
  scoreSimilarCreatorService,
} from "@/lib/similarCreatorServices";

const seed = {
  id: "s1",
  owner_id: "u1",
  category: "Graphic / Branding",
  tags: ["catsub:logo", "logo", "brand"],
};

function svc(
  partial: Partial<{
    id: string;
    owner_id: string;
    category: string;
    tags: string[];
    updated_at: string;
  }>,
) {
  return {
    id: "x",
    owner_id: "u2",
    category: "Graphic / Branding",
    tags: [] as string[],
    updated_at: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("similarCreatorServices", () => {
  it("scores exact category + tag overlap higher", () => {
    const a = scoreSimilarCreatorService(
      svc({ tags: ["logo", "catsub:logo"] }),
      seed,
      ["logo", "brand"],
    );
    const b = scoreSimilarCreatorService(
      svc({ category: "Photography", tags: [] }),
      seed,
      ["logo", "brand"],
    );
    expect(a).toBeGreaterThan(b);
  });

  it("keeps one package per owner and caps at limit", () => {
    const picked = pickSimilarCreatorServices(
      [
        svc({ id: "a1", owner_id: "a", tags: ["logo"], updated_at: "2026-07-02T00:00:00.000Z" }),
        svc({ id: "a2", owner_id: "a", tags: ["logo", "brand"], updated_at: "2026-07-01T00:00:00.000Z" }),
        svc({ id: "b1", owner_id: "b", tags: ["logo"] }),
        svc({ id: "c1", owner_id: "c", tags: [] }),
        svc({ id: "d1", owner_id: "d", tags: ["brand"] }),
        svc({ id: "e1", owner_id: "e", tags: ["other"] }),
      ],
      seed,
      4,
      ["logo", "brand"],
    );
    expect(picked).toHaveLength(4);
    expect(picked.filter((p) => p.owner_id === "a")).toHaveLength(1);
    expect(picked.find((p) => p.owner_id === "a")?.id).toBe("a2");
  });
});
