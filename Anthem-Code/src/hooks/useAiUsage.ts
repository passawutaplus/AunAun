import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AiUsageSummary = {
  tier: string;
  period_key: string;
  period_end: string | null;
  period_type?: string;
  included_used: number;
  included_limit: number;
  included_remaining: number;
  purchased_balance: number;
  total_remaining: number;
};

const EMPTY: AiUsageSummary = {
  tier: "free",
  period_key: "",
  period_end: null,
  period_type: "free_starter",
  included_used: 0,
  included_limit: 25,
  included_remaining: 25,
  purchased_balance: 0,
  total_remaining: 25,
};

function normalizeAiUsage(raw: Partial<AiUsageSummary> | null | undefined): AiUsageSummary {
  return {
    ...EMPTY,
    ...raw,
    included_used: Number(raw?.included_used ?? EMPTY.included_used),
    included_limit: Number(raw?.included_limit ?? EMPTY.included_limit),
    included_remaining: Number(raw?.included_remaining ?? EMPTY.included_remaining),
    purchased_balance: Number(raw?.purchased_balance ?? EMPTY.purchased_balance),
    total_remaining: Number(raw?.total_remaining ?? EMPTY.total_remaining),
  };
}

export function useAiUsage() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["ai-usage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ecosystem-ai-usage");
      if (error) throw error;
      return normalizeAiUsage(data as Partial<AiUsageSummary> | null);
    },
    staleTime: 30_000,
    retry: 1,
  });

  const data = normalizeAiUsage(query.data);
  return {
    ...data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    limitReached: data.total_remaining <= 0,
  };
}
