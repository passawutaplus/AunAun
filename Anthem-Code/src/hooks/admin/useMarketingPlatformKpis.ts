import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { useAdminStats } from "@/hooks/admin/useAdminData";

export type MarketingPlatformKpis = {
  creator: {
    newUsers24h: number;
    publishedProjects: number;
    follows24h: number;
  };
  hirer: {
    openJobs: number;
    pendingHiring: number;
    jobApplications: number;
    pendingApps: number;
  };
  community: {
    likes24h: number;
    comments24h: number;
    views24h: number;
  };
  retention: {
    active7d: number;
    active30d: number;
    returningUsers: number;
  };
  isLoading: boolean;
};

export function useMarketingPlatformKpis(): MarketingPlatformKpis {
  const stats = useAdminStats();
  const analytics = useAdminAnalytics(30);

  const s = stats.data;
  const a = analytics.data;

  return {
    creator: {
      newUsers24h: s?.newUsers24h ?? 0,
      publishedProjects: s?.publishedProjects ?? 0,
      follows24h: s?.follows24h ?? 0,
    },
    hirer: {
      openJobs: s?.openJobs ?? 0,
      pendingHiring: s?.pendingHiring ?? 0,
      jobApplications: a?.funnel.job_applications ?? 0,
      pendingApps: a?.funnel.pending_apps ?? 0,
    },
    community: {
      likes24h: s?.likes24h ?? 0,
      comments24h: s?.comments24h ?? 0,
      views24h: s?.views24h ?? 0,
    },
    retention: {
      active7d: a?.retention.active_7d ?? 0,
      active30d: a?.retention.active_30d ?? 0,
      returningUsers: a?.retention.returning_users ?? 0,
    },
    isLoading: stats.isLoading || analytics.isLoading,
  };
}
