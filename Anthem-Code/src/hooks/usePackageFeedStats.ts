import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isBenignQueryError } from "@/lib/supabaseErrors";

export type PackageFeedListingStats = {
  hireCount: number;
  reviewCount: number;
  ratingAvg: number | null;
};

export const EMPTY_PACKAGE_FEED_STATS: PackageFeedListingStats = {
  hireCount: 0,
  reviewCount: 0,
  ratingAvg: null,
};

function swallow(error: unknown): boolean {
  return isBenignQueryError(error as { message?: string; code?: string });
}

/** Batch hire + review aggregates for package cards (public reviews; hires when RLS allows). */
export async function fetchPackageFeedStats(
  serviceIds: string[],
): Promise<Record<string, PackageFeedListingStats>> {
  const map: Record<string, PackageFeedListingStats> = {};
  for (const id of serviceIds) map[id] = { ...EMPTY_PACKAGE_FEED_STATS };
  if (!serviceIds.length) return map;

  const [reviewsRes, hiresRes] = await Promise.all([
    supabase
      .from("work_reviews" as never)
      .select("service_id, rating, kind")
      .in("service_id", serviceIds)
      .eq("visibility", "public"),
    supabase.from("hiring_requests").select("service_id").in("service_id", serviceIds),
  ]);

  if (reviewsRes.error && !swallow(reviewsRes.error)) throw reviewsRes.error;
  // Hire rows may be RLS-empty for guests — treat as optional.
  if (hiresRes.error && !swallow(hiresRes.error)) {
    // keep hire counts at 0
  }

  const ratingSum = new Map<string, number>();
  const ratingN = new Map<string, number>();
  const hireFromReview = new Map<string, number>();

  for (const row of (reviewsRes.data ?? []) as {
    service_id: string | null;
    rating: number | null;
    kind: string | null;
  }[]) {
    if (!row.service_id || !map[row.service_id]) continue;
    const cur = map[row.service_id];
    cur.reviewCount += 1;
    const rating = Number(row.rating);
    if (Number.isFinite(rating) && rating > 0) {
      ratingSum.set(row.service_id, (ratingSum.get(row.service_id) ?? 0) + rating);
      ratingN.set(row.service_id, (ratingN.get(row.service_id) ?? 0) + 1);
    }
    if (row.kind === "hire") {
      hireFromReview.set(row.service_id, (hireFromReview.get(row.service_id) ?? 0) + 1);
    }
  }

  for (const [id, sum] of ratingSum) {
    const n = ratingN.get(id) ?? 0;
    if (n > 0) map[id].ratingAvg = Math.round((sum / n) * 10) / 10;
  }

  const hireFromRequests = new Map<string, number>();
  if (!hiresRes.error) {
    for (const row of (hiresRes.data ?? []) as { service_id: string | null }[]) {
      if (!row.service_id) continue;
      hireFromRequests.set(row.service_id, (hireFromRequests.get(row.service_id) ?? 0) + 1);
    }
  }

  for (const id of serviceIds) {
    const fromReq = hireFromRequests.get(id) ?? 0;
    const fromRev = hireFromReview.get(id) ?? 0;
    map[id].hireCount = fromReq > 0 ? fromReq : fromRev;
  }

  return map;
}

export function usePackageFeedStats(serviceIds: string[]) {
  const stableKey = serviceIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["package-feed-listing-stats", stableKey],
    enabled: serviceIds.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchPackageFeedStats(serviceIds),
    placeholderData: {},
  });
}
