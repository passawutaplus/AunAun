import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import type { PortfolioOverviewTimestamps } from "@/lib/portfolioOverviewSeries";

export type PortfolioOverviewPayload = {
  current: PortfolioOverviewTimestamps;
  previousTotals: {
    views: number;
    followers: number;
    hires: number;
    collabs: number;
    works: number;
  };
};

const EMPTY_TIMESTAMPS: PortfolioOverviewTimestamps = {
  views: [],
  followers: [],
  hires: [],
  collabs: [],
  works: [],
};

function swallowRows<T>(res: { data: T | null; error: unknown }): T {
  if (res.error && !isBenignQueryError(res.error as { message?: string; code?: string })) {
    throw res.error;
  }
  return (res.data ?? []) as T;
}

function pickTimestamps<T extends { created_at?: string | null }>(rows: T[]): string[] {
  return rows
    .map((row) => row.created_at)
    .filter((value): value is string => typeof value === "string");
}

async function fetchViews(projectIds: string[], fromIso: string, toIso: string): Promise<string[]> {
  if (!projectIds.length) return [];
  const res = await supabase
    .from("project_views")
    .select("viewed_at")
    .in("project_id", projectIds)
    .gte("viewed_at", fromIso)
    .lte("viewed_at", toIso)
    .order("viewed_at", { ascending: true });
  return swallowRows<{ viewed_at: string }[]>(res)
    .map((row) => row.viewed_at)
    .filter((value): value is string => typeof value === "string");
}

async function fetchFollowers(userId: string, fromIso: string, toIso: string): Promise<string[]> {
  const res = await supabase
    .from("follows")
    .select("created_at")
    .eq("following_id", userId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  return pickTimestamps(swallowRows(res));
}

async function fetchHires(userId: string, fromIso: string, toIso: string): Promise<string[]> {
  const res = await supabase
    .from("hiring_requests")
    .select("created_at")
    .eq("freelancer_id", userId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  return pickTimestamps(swallowRows(res));
}

async function fetchCollabs(userId: string, fromIso: string, toIso: string): Promise<string[]> {
  const res = await supabase
    .from("collab_requests")
    .select("created_at")
    .eq("recipient_id", userId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  return pickTimestamps(swallowRows(res));
}

async function fetchPublishedWorks(userId: string, fromIso: string, toIso: string): Promise<string[]> {
  const res = await supabase
    .from("projects")
    .select("created_at")
    .eq("owner_id", userId)
    .eq("status", "Published")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  return pickTimestamps(swallowRows(res));
}

async function fetchPortfolioOverviewPayload(
  ownerId: string,
  projectIds: string[],
  fromIso: string,
  toIso: string,
): Promise<PortfolioOverviewPayload> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const spanMs = Math.max(0, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);
  const prevFromIso = previousFrom.toISOString();
  const prevToIso = previousTo.toISOString();

  const [views, followers, hires, collabs, works, prevViews, prevFollowers, prevHires, prevCollabs, prevWorks] =
    await Promise.all([
      fetchViews(projectIds, fromIso, toIso),
      fetchFollowers(ownerId, fromIso, toIso),
      fetchHires(ownerId, fromIso, toIso),
      fetchCollabs(ownerId, fromIso, toIso),
      fetchPublishedWorks(ownerId, fromIso, toIso),
      fetchViews(projectIds, prevFromIso, prevToIso),
      fetchFollowers(ownerId, prevFromIso, prevToIso),
      fetchHires(ownerId, prevFromIso, prevToIso),
      fetchCollabs(ownerId, prevFromIso, prevToIso),
      fetchPublishedWorks(ownerId, prevFromIso, prevToIso),
    ]);

  return {
    current: { views, followers, hires, collabs, works },
    previousTotals: {
      views: prevViews.length,
      followers: prevFollowers.length,
      hires: prevHires.length,
      collabs: prevCollabs.length,
      works: prevWorks.length,
    },
  };
}

export function usePortfolioOverviewSeries(
  ownerId: string | undefined,
  projectIds: string[],
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  const stableProjectIds = projectIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["portfolio-overview-series", ownerId, stableProjectIds, fromIso, toIso],
    enabled: enabled && !!ownerId && !!fromIso && !!toIso,
    staleTime: 30_000,
    queryFn: () => fetchPortfolioOverviewPayload(ownerId!, projectIds, fromIso!, toIso!),
    placeholderData: {
      current: EMPTY_TIMESTAMPS,
      previousTotals: { views: 0, followers: 0, hires: 0, collabs: 0, works: 0 },
    },
  });
}
