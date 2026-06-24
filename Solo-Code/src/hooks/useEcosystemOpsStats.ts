import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EcosystemOpsStats = {
  generated_at: string;
  day_key: string;
  drill: {
    rerolls_today: number;
    rerolls_7d: number;
    cross_links_7d: number;
    cross_links_converted_7d: number;
    conversion_pct: number;
    drill_posts_total: number;
    top_users: Array<{
      user_id: string;
      rerolls_today: number;
      drill_links_7d: number;
      score?: number;
    }>;
  };
  meeting: {
    captures_total: number;
    by_status: Record<string, number>;
    credits_7d: number;
    recent: Array<{
      id: string;
      user_id: string;
      title: string | null;
      status: string;
      duration_sec: number | null;
      created_at: string;
    }>;
  };
};

export function useEcosystemOpsStats() {
  return useQuery({
    queryKey: ["admin-ecosystem-ops-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_ecosystem_ops_stats");
      if (error) throw error;
      return data as EcosystemOpsStats;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
