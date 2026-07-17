/**
 * Client-side view affinity for Explore ranking (works for guests + supplements signed-in).
 * Stores recent project view signals in localStorage (categories + opportunity types).
 */

const STORAGE_KEY = "aplus1_view_affinity_v1";
const MAX_EVENTS = 40;

export type ViewAffinityEvent = {
  category?: string;
  opportunityTypes: string[];
  at: number;
};

function readEvents(): ViewAffinityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ViewAffinityEvent[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: ViewAffinityEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* ignore quota */
  }
}

export function recordProjectViewAffinity(input: {
  category?: string | null;
  opportunityTypes?: string[] | null;
}): void {
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const opportunityTypes = (input.opportunityTypes ?? [])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
  if (!category && opportunityTypes.length === 0) return;

  const next: ViewAffinityEvent = {
    category: category || undefined,
    opportunityTypes,
    at: Date.now(),
  };
  const prev = readEvents().filter(
    (e) => !(e.category === next.category && e.opportunityTypes.join() === next.opportunityTypes.join() && Date.now() - e.at < 5_000),
  );
  writeEvents([next, ...prev]);
}

export function getViewAffinityWeights(): {
  categories: Record<string, number>;
  opportunityTypes: Record<string, number>;
} {
  const events = readEvents();
  const categories: Record<string, number> = {};
  const opportunityTypes: Record<string, number> = {};
  events.forEach((e, idx) => {
    const recency = Math.max(1, events.length - idx);
    if (e.category) categories[e.category] = (categories[e.category] ?? 0) + recency;
    for (const t of e.opportunityTypes) {
      opportunityTypes[t] = (opportunityTypes[t] ?? 0) + recency;
    }
  });
  return { categories, opportunityTypes };
}

export function scoreByViewAffinity(
  category: string | null | undefined,
  opportunityTypes: string[] | null | undefined,
  weights: ReturnType<typeof getViewAffinityWeights>,
): number {
  let score = 0;
  if (category && weights.categories[category]) score += weights.categories[category] * 2;
  for (const t of opportunityTypes ?? []) {
    if (weights.opportunityTypes[t]) score += weights.opportunityTypes[t];
  }
  return score;
}

export function sortByViewAffinity<T extends {
  id: string;
  category?: string | null;
  opportunity_types?: string[] | null;
}>(items: T[]): T[] {
  const weights = getViewAffinityWeights();
  if (
    Object.keys(weights.categories).length === 0 &&
    Object.keys(weights.opportunityTypes).length === 0
  ) {
    return items;
  }
  return [...items].sort((a, b) => {
    const diff =
      scoreByViewAffinity(b.category, b.opportunity_types, weights) -
      scoreByViewAffinity(a.category, a.opportunity_types, weights);
    if (diff !== 0) return diff;
    return 0;
  });
}

export function projectMatchesOpportunityFilter(
  filter: string | "All",
  projectTypes: string[] | null | undefined,
  ownerTypes: string[] | null | undefined,
): boolean {
  if (!filter || filter === "All") return true;
  const pool = new Set([...(projectTypes ?? []), ...(ownerTypes ?? [])]);
  return pool.has(filter);
}
