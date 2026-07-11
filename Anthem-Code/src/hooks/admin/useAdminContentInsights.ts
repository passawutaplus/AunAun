import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadDataPackZip } from "@/lib/admin/dataExport";

export type ContentInsightRow = {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  views_total?: number;
  views_period: number;
  unique_viewers?: number;
  likes_period?: number;
  comments_period?: number;
  hires_period?: number;
  collabs_period?: number;
  like_rate_pct?: number;
  opportunity_rate_pct?: number;
  rising_pct?: number;
  has_cover?: boolean;
  allow_hire?: boolean;
  allow_collab?: boolean;
  age_days?: number;
  created_at?: string;
  cohort?: string;
};

export type CategoryStat = {
  category: string;
  project_count: number;
  views_period: number;
  views_total: number;
  avg_views_period: number;
  likes_period: number;
  opportunities_period: number;
  zero_views_count: number;
};

export type ContentInsights = {
  generated_at: string;
  days: number;
  summary: {
    published_projects: number;
    views_period_total: number;
    unique_viewers_period: number;
    hot_count: number;
    cold_count: number;
    zero_views_period: number;
    avg_views_period: number;
  };
  top_views: ContentInsightRow[];
  bottom_views: ContentInsightRow[];
  rising: ContentInsightRow[];
  high_view_low_conversion: ContentInsightRow[];
  opportunity_gaps: ContentInsightRow[];
  category_stats: CategoryStat[];
  projects_ranked: ContentInsightRow[];
};

export function useAdminContentInsights(days = 30) {
  return useQuery({
    queryKey: ["admin-content-insights", days],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_content_insights" as never, {
        _days: days,
      } as never);
      if (error) throw error;
      return data as unknown as ContentInsights;
    },
  });
}

export function useDownloadContentInsightsPack() {
  return useMutation({
    mutationFn: async (days: number) => {
      const { data, error } = await supabase.rpc("admin_export_data_pack" as never, {
        _days: days,
        _pack: "content",
        _limit: 5000,
      } as never);
      if (error) throw error;
      const pack = (data ?? {}) as Record<string, unknown>;
      const stamp = new Date().toISOString().slice(0, 10);
      downloadDataPackZip(pack, `aplus1-content-insights-${days}d-${stamp}.zip`);
      return pack;
    },
  });
}
