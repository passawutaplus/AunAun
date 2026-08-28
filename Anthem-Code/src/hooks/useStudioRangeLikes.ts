import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isBenignQueryError } from "@/lib/supabaseErrors";

/** Likes on the owner's works within a date range (chart filter). */
export function useStudioRangeLikes(
  projectIds: string[],
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  const stableIds = projectIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["studio-range-likes", stableIds, fromIso, toIso],
    enabled: enabled && !!fromIso && !!toIso,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<number> => {
      if (!projectIds.length) return 0;
      const { count, error } = await supabase
        .from("project_likes")
        .select("project_id", { count: "exact", head: true })
        .in("project_id", projectIds)
        .gte("created_at", fromIso!)
        .lte("created_at", toIso!);
      if (error && !isBenignQueryError(error)) throw error;
      return count ?? 0;
    },
  });
}
