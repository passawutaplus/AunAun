import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPackagePublicStats } from "@/hooks/usePackageSignals";
import { isBenignQueryError } from "@/lib/supabaseErrors";

export type PackageFeedListingStats = {
  hireCount: number;
  /** Signed-in + guest views. */
  views: number;
  reviewCount: number;
  ratingAvg: number | null;
};

export const EMPTY_PACKAGE_FEED_STATS: PackageFeedListingStats = {
  views: 0,
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

  // Long id lists are split so the request URL stays short.
  const chunks: string[][] = [];
  for (let i = 0; i < serviceIds.length; i += 150) chunks.push(serviceIds.slice(i, i + 150));
  const [reviewParts, publicStats] = await Promise.all([
    Promise.all(
      chunks.map((ids) =>
        supabase
          .from("work_reviews" as never)
          .select("service_id, rating, kind")
          .in("service_id", ids)
          .eq("visibility", "public"),
      ),
    ),
    // Real hires (accepted / closed) + views via a public RPC — readable by guests too.
    fetchPackagePublicStats(serviceIds).catch(() => null),
  ]);
  const reviewErr = reviewParts.find((r) => r.error)?.error;
  if (reviewErr && !swallow(reviewErr)) throw reviewErr;
  const reviewsRes = { data: reviewParts.flatMap((r) => (r.data ?? []) as unknown[]) };

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

  for (const id of serviceIds) {
    const fromRpc = publicStats?.get(id);
    const fromRev = hireFromReview.get(id) ?? 0;
    map[id].hireCount = Math.max(fromRpc?.hires ?? 0, fromRev);
    map[id].views = fromRpc?.views ?? 0;
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
