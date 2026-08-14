import { useCallback, useEffect, useState } from "react";
import {
  getFeedSearchQueries,
  recordFeedSearch,
} from "@/lib/feedSearchSignals";

const ANON_KEY = "anon";
const MAX_VISIBLE = 8;

function storageUserId(userId?: string | null): string {
  return userId?.trim() || ANON_KEY;
}

/** Recent feed searches for SearchBar chips (backed by feed-search-signals). */
export function useSearchHistory(userId?: string | null) {
  const key = storageUserId(userId);
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

  return { queries, record, refresh };
}
