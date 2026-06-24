import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDailyTrends } from "@/lib/dailyTrends.functions";
import { DAILY_TRENDS_QUERY_KEY, DAILY_TRENDS_STALE_MS } from "@/hooks/useDailyTrendsPrefetch";

export function useDailyTrendsQuery() {
  const fetchTrends = useServerFn(getDailyTrends);
  return useQuery({
    queryKey: DAILY_TRENDS_QUERY_KEY,
    queryFn: () => fetchTrends(),
    staleTime: DAILY_TRENDS_STALE_MS,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 5000 : false),
  });
}
