import {
  parseCategorySubId,
  parentIdForProjectCategory,
  stripCategorySubTags,
} from "@/data/categoryTaxonomy";
import { normalizeProjectCategory } from "@/data/projectTypes";

type SimilarSeed = {
  id: string;
  owner_id: string;
  category: string;
  tags: string[];
};

type SimilarCandidate = SimilarSeed & {
  updated_at: string;
};

export function scoreSimilarCreatorService(
  candidate: SimilarSeed,
  seed: SimilarSeed,
  seedUserTags: string[] = stripCategorySubTags(seed.tags),
): number {
  let score = 0;
  const seedCat = normalizeProjectCategory(seed.category) ?? seed.category.trim();
  const candCat = normalizeProjectCategory(candidate.category) ?? candidate.category.trim();
  const seedParent = parentIdForProjectCategory(seedCat);
  const candParent = parentIdForProjectCategory(candCat);

  if (seedCat && candCat && seedCat === candCat) score += 5;
  else if (seedParent && candParent && seedParent === candParent) score += 3;

  const seedSub = parseCategorySubId(seed.tags);
  const candSub = parseCategorySubId(candidate.tags);
  if (seedSub && candSub && seedSub === candSub) score += 4;

  const candTags = new Set(stripCategorySubTags(candidate.tags).map((t) => t.toLowerCase()));
  for (const tag of seedUserTags) {
    if (candTags.has(tag.toLowerCase())) score += 2;
  }

  return score;
}

/** Best package per creator, ranked by similarity — max `limit` cards. */
export function pickSimilarCreatorServices<T extends SimilarCandidate>(
  candidates: T[],
  seed: SimilarSeed,
  limit = 4,
  seedUserTags: string[] = stripCategorySubTags(seed.tags),
): T[] {
  const bestByOwner = new Map<string, { service: T; score: number }>();

  for (const candidate of candidates) {
    if (candidate.id === seed.id || candidate.owner_id === seed.owner_id) continue;
    const score = scoreSimilarCreatorService(candidate, seed, seedUserTags);
    const prev = bestByOwner.get(candidate.owner_id);
    if (!prev || score > prev.score) {
      bestByOwner.set(candidate.owner_id, { service: candidate, score });
      continue;
    }
    if (
      score === prev.score &&
      Date.parse(candidate.updated_at) > Date.parse(prev.service.updated_at)
    ) {
      bestByOwner.set(candidate.owner_id, { service: candidate, score });
    }
  }

  return Array.from(bestByOwner.values())
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.service.updated_at) - Date.parse(a.service.updated_at),
    )
    .slice(0, limit)
    .map((x) => x.service);
}
