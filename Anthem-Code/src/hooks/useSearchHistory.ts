import { useCallback, useEffect, useState } from "react";
import {
  getFeedSearchQueries,
  recordFeedSearch,
  removeFeedSearch,
} from "@/lib/feedSearchSignals";

const ANON_KEY = "anon";
const MAX_VISIBLE = 8;

function storageUserId(userId?: string | null): string {
  return userId?.trim() || ANON_KEY;
}

/** Searches outside Showcase keep their own list; Showcase keeps the original key (it also feeds recommendations). */
export type SearchHistoryScope = "creators" | "exhibition";

/** Recent feed searches for SearchBar chips (backed by feed-search-signals). */
export function useSearchHistory(userId?: string | null, scope?: SearchHistoryScope) {
  const key = scope ? `${storageUserId(userId)}:${scope}` : storageUserId(userId);
  const [queries, setQueries] = useState<string[]>([]);

  const refresh = useCallback(() => {
    const all = getFeedSearchQueries(key);
    setQueries([...all].reverse().slice(0, MAX_VISIBLE));
  }, [key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const record = useCallback(
    (query: string) => {
      recordFeedSearch(key, query);
      refresh();
    },
    [key, refresh],
  );

  const remove = useCallback(
    (query: string) => {
      removeFeedSearch(key, query);
      refresh();
    },
    [key, refresh],
  );

  return { queries, record, remove, refresh };
}
