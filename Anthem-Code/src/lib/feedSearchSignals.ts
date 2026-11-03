import { aggregateSearchCategoryWeights } from "@/lib/forYouBlend";

const STORAGE_PREFIX = "feed-search-signals:";
const MAX_QUERIES = 20;

type StoredSignals = {
  queries: string[];
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function read(userId: string): StoredSignals {
  if (typeof window === "undefined") return { queries: [] };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { queries: [] };
    const parsed = JSON.parse(raw) as StoredSignals;
    return { queries: Array.isArray(parsed.queries) ? parsed.queries : [] };
  } catch {
    return { queries: [] };
  }
}

function write(userId: string, state: StoredSignals) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

/** Record a feed search query for personalization (deduped, most recent last). */
export function recordFeedSearch(userId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  const state = read(userId);
  const without = state.queries.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const queries = [...without, trimmed].slice(-MAX_QUERIES);
  write(userId, { queries });
}

/** Drop one query from the history (case-insensitive), e.g. the X on a recent search. */
export function removeFeedSearch(userId: string, query: string) {
  const target = query.trim().toLowerCase();
  const state = read(userId);
  write(userId, { queries: state.queries.filter((q) => q.toLowerCase() !== target) });
}

export function getFeedSearchQueries(userId: string): string[] {
  return read(userId).queries;
}

export function getFeedSearchCategoryWeights(userId: string): Record<string, number> {
  return aggregateSearchCategoryWeights(getFeedSearchQueries(userId));
}

export { mapSearchQueryToCategories } from "@/lib/forYouBlend";
