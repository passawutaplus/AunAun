import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsOverview {
  signups: { date: string; count: number }[];
  engagement: { date: string; likes: number; comments: number; views: number }[];
  funnel: {
    hiring_requests: number;
    collab_requests: number;
    job_posts: number;
    job_applications: number;
    contracts: number;
    pending_hires: number;
    pending_apps: number;
  };
  revenue: { gifts_px: number; topups_px: number; cashouts_px: number };
  retention: { active_7d: number; active_30d: number; returning_users: number };
}

export function useAdminAnalytics(days = 30) {
  return useQuery<AnalyticsOverview>({
    queryKey: ["admin-analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics_overview", { _days: days });
      if (error) throw error;
      return data as unknown as AnalyticsOverview;
    },
  });
}
