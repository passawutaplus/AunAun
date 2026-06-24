import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateDailyTrends, getDailyTrends } from "@/lib/dailyTrends.functions";

export const DAILY_TRENDS_QUERY_KEY = ["daily-trends"] as const;
export const DAILY_TRENDS_STALE_MS = 1000 * 60 * 60 * 6;

/** Prefetch trends on dashboard mount; warm cache in background if missing. */
export function useDailyTrendsPrefetch() {
  const queryClient = useQueryClient();
  const fetchTrends = useServerFn(getDailyTrends);
  const warmTrends = useServerFn(generateDailyTrends);

  React.useEffect(() => {
    let cancelled = false;

    // Defer so first paint + AI chat are not competing with trends generation.
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      void (async () => {
        try {
          const data = await queryClient.fetchQuery({
            queryKey: DAILY_TRENDS_QUERY_KEY,
            queryFn: () => fetchTrends(),
            staleTime: DAILY_TRENDS_STALE_MS,
          });

          if (cancelled || data.status !== "pending") return;

          warmTrends()
            .then(() => {
              if (!cancelled) {
                void queryClient.invalidateQueries({ queryKey: DAILY_TRENDS_QUERY_KEY });
              }
            })
            .catch(() => {
              // generation failed — TrendsTab shows pending state
            });
        } catch {
          // prefetch failed silently
        }
      })();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryClient, fetchTrends, warmTrends]);
}
