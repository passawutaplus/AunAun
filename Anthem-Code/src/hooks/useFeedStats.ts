import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeedStats = {
  designers: number;
  projects: number;
  hires: number;
  successfulCollabs: number;
};

const numericStat = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * Prefer RPC only after migration adds `successful_collabs`.
 * Legacy `collabs` counted collab_requests — do not treat it as successfulCollabs.
 */
export function parsePublicFeedStatsRpc(data: unknown): FeedStats | null {
  if (!data || typeof data !== "object") return null;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object") return null;

  const o = result as Record<string, unknown>;
  if (typeof o.successful_collabs !== "number" || !Number.isFinite(o.successful_collabs)) {
    return null;
  }

  return {
    designers: numericStat(o.designers),
    projects: numericStat(o.projects),
    hires: numericStat(o.hires),
    successfulCollabs: o.successful_collabs,
  };
}

async function fetchFeedStats(): Promise<FeedStats> {
  const { data, error } = await supabase.rpc("public_feed_stats" as never);
  if (!error) {
    const parsed = parsePublicFeedStatsRpc(data);
    if (parsed) return parsed;
  }

  const [
    { count: designersCount, error: designersError },
    { count: projectsCount, error: projectsError },
    { count: hiresCount, error: hiresError },
    { count: successfulCollabsCount, error: successfulCollabsError },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "Published"),
    supabase.from("hiring_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "Published")
      .not("collab_user_ids", "is", null)
      .not("collab_user_ids", "eq", "{}"),
  ]);

  const countFrom = (res: { count: number | null; error: { message: string } | null }) => {
    if (res.error) return 0;
    return res.count ?? 0;
  };

  return {
    designers: countFrom({ count: designersCount, error: designersError }),
    projects: countFrom({ count: projectsCount, error: projectsError }),
    hires: countFrom({ count: hiresCount, error: hiresError }),
    successfulCollabs: countFrom({
      count: successfulCollabsCount,
      error: successfulCollabsError,
    }),
  };
}

export const useFeedStats = () =>
  useQuery({
    queryKey: ["feed-stats"],
    staleTime: 60_000,
    queryFn: fetchFeedStats,
  });
