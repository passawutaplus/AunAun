import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PageDwellRow = {
  path_key: string;
  feature: string;
  visits: number;
  sessions: number;
  users?: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms?: number;
  total_ms: number;
};

export type PageDwellInsights = {
  generated_at: string;
  days: number;
  summary: {
    visits: number;
    sessions: number;
    users: number;
    paths: number;
    avg_ms: number;
    max_ms: number;
    min_ms: number;
    total_ms: number;
  };
  longest_avg: PageDwellRow[];
  shortest_avg: PageDwellRow[];
  longest_max: PageDwellRow[];
  by_feature: PageDwellRow[];
  paths_ranked: PageDwellRow[];
};

export function useAdminPageDwellInsights(days = 30) {
  return useQuery({
    queryKey: ["admin-page-dwell", days],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_page_dwell_insights" as never, {
        _days: days,
      } as never);
      if (error) throw error;
      return data as unknown as PageDwellInsights;
    },
  });
}

export function formatDwellMinutes(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  const minutes = ms / 60_000;
  if (minutes < 1) return `${Math.round(ms / 1000)} วิ`;
  if (minutes < 10) return `${minutes.toFixed(1)} น.`;
  return `${Math.round(minutes)} น.`;
}
