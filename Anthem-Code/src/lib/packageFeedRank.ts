import { parentIdForProjectCategory } from "@/data/categoryTaxonomy";
import { mapSearchQueryToCategories } from "@/lib/forYouBlend";
import { tokenizeQuery } from "@/lib/fuzzyMatch";

export type RankablePackage = {
  searchHaystack: string;
  service: {
    id: string;
    owner_id: string;
    title: string;
    category: string;
    tags: string[];
    sort_order: number;
    updated_at: string;
    price_min_thb: number;
    price_thb: number;
  };
};

export type PackageListingSignals = {
  interests: string[];
  /** View-affinity + past search category weights. */
  categoryWeights?: Record<string, number>;
  searchQuery?: string;
};

function idJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h >>> 0) % 1000;
}

function updatedMs(row: RankablePackage): number {
  const t = Date.parse(row.service.updated_at);
  return Number.isFinite(t) ? t : 0;
}

function startPrice(row: RankablePackage): number {
  return row.service.price_min_thb || row.service.price_thb || 0;
}

/** How well a package matches the viewer's interests, search, and viewed categories. */
export function scorePackageInterest(row: RankablePackage, signals: PackageListingSignals): number {
  let score = 0;
  const cat = (row.service.category ?? "").trim();
  const catLower = cat.toLowerCase();
  const interestSet = new Set(signals.interests.map((i) => i.toLowerCase()));
  const parent = cat ? parentIdForProjectCategory(cat) : null;

  if (cat && interestSet.has(catLower)) score += 8;
  else if (parent) {
    for (const interest of signals.interests) {
      if (parentIdForProjectCategory(interest) === parent) {
        score += 4;
        break;
      }
    }
  }

  for (const tag of row.service.tags) {
    if (tag && interestSet.has(tag.toLowerCase())) score += 2;
  }

  const weights = signals.categoryWeights ?? {};
  if (cat && weights[cat]) score += weights[cat];

  const query = signals.searchQuery?.trim() ?? "";
  if (query) {
    const mapped = mapSearchQueryToCategories(query);
    if (mapped.some((m) => m.toLowerCase() === catLower)) score += 10;
    const title = row.service.title.toLowerCase();
    const hay = row.searchHaystack.toLowerCase();
    const qLower = query.toLowerCase();
    if (title.includes(qLower)) score += 12;
    for (const token of tokenizeQuery(query)) {
      if (title.includes(token)) score += 6;
      else if (hay.includes(token)) score += 2;
    }
  }

  return score;
}

function betterRow(a: RankablePackage, aScore: number, b: RankablePackage, bScore: number): RankablePackage {
  if (aScore !== bScore) return aScore > bScore ? a : b;
  if (a.service.sort_order !== b.service.sort_order) {
    return a.service.sort_order < b.service.sort_order ? a : b;
  }
  if (updatedMs(a) !== updatedMs(b)) return updatedMs(a) > updatedMs(b) ? a : b;
  return a.service.id.localeCompare(b.service.id) <= 0 ? a : b;
}

/** One published package per creator — highest listing score wins. */
export function pickOnePackagePerOwner<T extends RankablePackage>(
  rows: T[],
  score: (row: T) => number,
): T[] {
  const best = new Map<string, { row: T; score: number }>();
  for (const row of rows) {
    const owner = row.service.owner_id;
    if (!owner) continue;
    const nextScore = score(row);
    const prev = best.get(owner);
    if (!prev) {
      best.set(owner, { row, score: nextScore });
      continue;
    }
    const winner = betterRow(row, nextScore, prev.row, prev.score);
    best.set(owner, { row: winner as T, score: winner === row ? nextScore : prev.score });
  }
  return Array.from(best.values()).map((x) => x.row);
}

export function rankPackagesForYou<T extends RankablePackage>(
  rows: T[],
  signals: PackageListingSignals,
): T[] {
  return [...rows].sort((a, b) => {
    const diff = scorePackageInterest(b, signals) - scorePackageInterest(a, signals);
    if (diff !== 0) return diff;
    const jitter = idJitter(b.service.id) - idJitter(a.service.id);
    if (jitter !== 0) return jitter;
    return updatedMs(b) - updatedMs(a);
  });
}

export function rankPackagesNewest<T extends RankablePackage>(rows: T[]): T[] {
  return [...rows].sort((a, b) => updatedMs(b) - updatedMs(a) || a.service.id.localeCompare(b.service.id));
}

export function rankPackagesByPrice<T extends RankablePackage>(rows: T[]): T[] {
  return [...rows].sort((a, b) => startPrice(b) - startPrice(a) || updatedMs(b) - updatedMs(a));
}
