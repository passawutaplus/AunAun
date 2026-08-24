import { describe, expect, it } from "vitest";
import {
  pickOnePackagePerOwner,
  rankPackagesByPrice,
  rankPackagesForYou,
  rankPackagesNewest,
  scorePackageInterest,
  type RankablePackage,
} from "@/lib/packageFeedRank";

const pkg = (
  id: string,
  owner: string,
  opts: Partial<RankablePackage["service"]> & { haystack?: string } = {},
): RankablePackage => ({
  searchHaystack: (opts.haystack ?? `${opts.title ?? id} ${opts.category ?? ""}`).toLowerCase(),
  service: {
    id,
    owner_id: owner,
    title: opts.title ?? id,
    category: opts.category ?? "Graphic / Branding",
    tags: opts.tags ?? [],
    sort_order: opts.sort_order ?? 0,
    updated_at: opts.updated_at ?? "2026-01-01T00:00:00Z",
    price_min_thb: opts.price_min_thb ?? 0,
    price_thb: opts.price_thb ?? 0,
  },
});

describe("packageFeedRank", () => {
  it("keeps one package per owner — highest interest score", () => {
    const logo = pkg("logo", "u1", { title: "โลโก้", category: "Graphic / Branding" });
    const photo = pkg("photo", "u1", { title: "ถ่ายรูป", category: "Photography" });
    const other = pkg("web", "u2", { title: "เว็บ", category: "UI/UX" });
    const picked = pickOnePackagePerOwner([logo, photo, other], (row) =>
      scorePackageInterest(row, { interests: ["Graphic / Branding"] }),
    );
    expect(picked.map((p) => p.service.id).sort()).toEqual(["logo", "web"]);
  });

  it("prefers search title match when picking among one owner", () => {
    const weak = pkg("a", "u1", { title: "แพ็กเกจทั่วไป", category: "Photography", haystack: "แพ็กเกจทั่วไป photography" });
    const strong = pkg("b", "u1", { title: "โลโก้ร้านกาแฟ", category: "Graphic / Branding", haystack: "โลโก้ร้านกาแฟ logo branding" });
    const picked = pickOnePackagePerOwner([weak, strong], (row) =>
      scorePackageInterest(row, { interests: [], searchQuery: "logo" }),
    );
    expect(picked).toHaveLength(1);
    expect(picked[0].service.id).toBe("b");
  });

  it("ranks for-you by interest before newer-but-unrelated", () => {
    const match = pkg("m", "u1", { category: "UI/UX", updated_at: "2026-01-01T00:00:00Z" });
    const recent = pkg("r", "u2", { category: "Photography", updated_at: "2026-08-01T00:00:00Z" });
    const ranked = rankPackagesForYou([recent, match], { interests: ["UI/UX"] });
    expect(ranked[0].service.id).toBe("m");
  });

  it("ranks newest by updated_at", () => {
    const old = pkg("old", "u1", { updated_at: "2025-01-01T00:00:00Z" });
    const neu = pkg("new", "u2", { updated_at: "2026-06-01T00:00:00Z" });
    expect(rankPackagesNewest([old, neu]).map((p) => p.service.id)).toEqual(["new", "old"]);
  });

  it("ranks by starting price", () => {
    const cheap = pkg("c", "u1", { price_min_thb: 2000 });
    const pricey = pkg("p", "u2", { price_min_thb: 18000 });
    expect(rankPackagesByPrice([cheap, pricey]).map((p) => p.service.id)).toEqual(["p", "c"]);
  });
});
