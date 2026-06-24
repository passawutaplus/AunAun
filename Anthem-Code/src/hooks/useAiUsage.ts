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

export function useAiUsage() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["ai-usage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ecosystem-ai-usage");
      if (error) throw error;
      return (data ?? EMPTY) as AiUsageSummary;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const data = query.data ?? EMPTY;
  return {
    ...data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    limitReached: data.total_remaining <= 0,
  };
}
