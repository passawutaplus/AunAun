import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/auth/AuthProvider";
import { fetchAiUsage } from "@/lib/aiUsage.functions";
import type { AiUsageSummary } from "@/lib/aiCredits";
import { DAILY_AI_CREDITS } from "@/lib/aiCredits";

const EMPTY: AiUsageSummary = {
  tier: "free",
  period_key: "",
  period_end: null,
  period_type: "free_daily_trial",
  included_used: 0,
  included_limit: 0,
  included_remaining: 0,
  purchased_balance: 0,
  daily_remaining: DAILY_AI_CREDITS,
  daily_limit: DAILY_AI_CREDITS,
  daily_eligible: true,
  daily_period_key: null,
  daily_resets_at: null,
  free_trial_days_left: 14,
  free_trial_ends_at: null,
  total_remaining: DAILY_AI_CREDITS,
};

export function useAiUsage() {
  const { user } = useAuth();
  const fetchFn = useServerFn(fetchAiUsage);

  const query = useQuery({
    queryKey: ["ai-usage", user?.id],
    enabled: !!user,
    queryFn: () => fetchFn(),
    staleTime: 30_000,
    retry: 1,
  });

  const data: AiUsageSummary = {
    ...EMPTY,
    ...(query.data ?? {}),
  };

  return {
    ...data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    limitReached: data.total_remaining <= 0,
  };
}
