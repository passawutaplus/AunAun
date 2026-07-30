import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fromCreatorServiceViews } from "@/lib/creatorServicesDb";
import { isBenignQueryError } from "@/lib/supabaseErrors";

export type PackageManageStats = {
  viewCount: number;
  hireCount: number;
};

export const EMPTY_PACKAGE_STATS: PackageManageStats = {
  viewCount: 0,
  hireCount: 0,
};

function swallowCount(res: { count: number | null; error: unknown }): number {
  if (res.error && !isBenignQueryError(res.error as { message?: string; code?: string })) {
    throw res.error;
  }
  return res.count ?? 0;
}

export function usePackageManageStats(ownerId: string | undefined, serviceIds: string[]) {
  const stableIds = serviceIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["package-manage-stats", ownerId, stableIds],
    enabled: !!ownerId && serviceIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<PackageManageStats> => {
      const [views, hires] = await Promise.all([
        fromCreatorServiceViews()
          .select("*", { count: "exact", head: true })
          .in("service_id", serviceIds),
        supabase
          .from("hiring_requests")
          .select("*", { count: "exact", head: true })
          .in("service_id", serviceIds),
      ]);
      return {
        viewCount: swallowCount(views),
        hireCount: swallowCount(hires),
      };
    },
    placeholderData: EMPTY_PACKAGE_STATS,
  });
}
