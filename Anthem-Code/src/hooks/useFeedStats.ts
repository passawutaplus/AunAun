import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FeedStats = { designers: number; projects: number; collabs: number; hires: number };

async function fetchFeedStats(): Promise<FeedStats> {
  const { data, error } = await supabase.rpc("public_feed_stats");
  if (!error && data && typeof data === "object") {
    const o = data as Record<string, number>;
    return {
      designers: o.designers ?? 0,
      projects: o.projects ?? 0,
      collabs: o.collabs ?? 0,
      hires: o.hires ?? 0,
    };
  }

  const [
    { count: designersCount, error: designersError },
    { count: projectsCount, error: projectsError },
    { count: collabsCount, error: collabsError },
    { count: hiresCount, error: hiresError },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "Published"),
    supabase.from("collab_requests").select("id", { count: "exact", head: true }),
    supabase.from("hiring_requests").select("id", { count: "exact", head: true }),
  ]);

  const countFrom = (res: { count: number | null; error: { message: string } | null }) => {
    if (res.error) return 0;
    return res.count ?? 0;
  };

  return {
    designers: countFrom({ count: designersCount, error: designersError }),
    projects: countFrom({ count: projectsCount, error: projectsError }),
    collabs: countFrom({ count: collabsCount, error: collabsError }),
    hires: countFrom({ count: hiresCount, error: hiresError }),
  };
}

export const useFeedStats = () =>
  useQuery({
    queryKey: ["feed-stats"],
    staleTime: 60_000,
    queryFn: fetchFeedStats,
  });
