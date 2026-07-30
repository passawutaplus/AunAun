import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fromCreatorServices, fromCreatorServiceViews } from "@/lib/creatorServicesDb";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import type { PackageOverviewTimestamps } from "@/lib/packageOverviewSeries";

export type PackageOverviewPayload = {
  current: PackageOverviewTimestamps;
  previousTotals: {
    views: number;
    hires: number;
    packages: number;
  };
};

const EMPTY_TIMESTAMPS: PackageOverviewTimestamps = {
  views: [],
  hires: [],
  packages: [],
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

async function fetchViews(serviceIds: string[], fromIso: string, toIso: string): Promise<string[]> {
  if (!serviceIds.length) return [];
  const res = await fromCreatorServiceViews()
    .select("viewed_at")
    .in("service_id", serviceIds)
    .gte("viewed_at", fromIso)
    .lte("viewed_at", toIso)
    .order("viewed_at", { ascending: true });
  return swallowRows<{ viewed_at: string }[]>(res)
    .map((row) => row.viewed_at)
    .filter((value): value is string => typeof value === "string");
}

async function fetchHires(serviceIds: string[], fromIso: string, toIso: string): Promise<string[]> {
  if (!serviceIds.length) return [];
  const res = await supabase
    .from("hiring_requests")
    .select("created_at")
    .in("service_id", serviceIds)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  return pickTimestamps(swallowRows(res));
}

async function fetchPublishedPackages(
  ownerId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const res = await fromCreatorServices()
    .select("created_at")
    .eq("owner_id", ownerId)
    .eq("status", "Published")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  return pickTimestamps(swallowRows(res));
}

async function fetchPackageOverviewPayload(
  ownerId: string,
  serviceIds: string[],
  fromIso: string,
  toIso: string,
): Promise<PackageOverviewPayload> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const spanMs = Math.max(0, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);
  const prevFromIso = previousFrom.toISOString();
  const prevToIso = previousTo.toISOString();

  const [views, hires, packages, prevViews, prevHires, prevPackages] = await Promise.all([
    fetchViews(serviceIds, fromIso, toIso),
    fetchHires(serviceIds, fromIso, toIso),
    fetchPublishedPackages(ownerId, fromIso, toIso),
    fetchViews(serviceIds, prevFromIso, prevToIso),
    fetchHires(serviceIds, prevFromIso, prevToIso),
    fetchPublishedPackages(ownerId, prevFromIso, prevToIso),
  ]);

  return {
    current: { views, hires, packages },
    previousTotals: {
      views: prevViews.length,
      hires: prevHires.length,
      packages: prevPackages.length,
    },
  };
}

export function usePackageOverviewSeries(
  ownerId: string | undefined,
  serviceIds: string[],
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  const stableIds = serviceIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["package-overview-series", ownerId, stableIds, fromIso, toIso],
    enabled: enabled && !!ownerId && !!fromIso && !!toIso,
    staleTime: 30_000,
    queryFn: () => fetchPackageOverviewPayload(ownerId!, serviceIds, fromIso!, toIso!),
    placeholderData: {
      current: EMPTY_TIMESTAMPS,
      previousTotals: { views: 0, hires: 0, packages: 0 },
    },
  });
}

/** Logged-in visitor opens a package detail — upsert view for owner analytics. */
export async function recordCreatorServiceView(args: {
  viewerId: string;
  serviceId: string;
  ownerId: string;
  /** Portfolio project that led here (first-touch attribution). */
  referrerProjectId?: string | null;
}): Promise<void> {
  if (!args.viewerId || !args.serviceId) return;
  if (args.viewerId === args.ownerId) return;

  const referrer =
    args.referrerProjectId && isUuidLike(args.referrerProjectId)
      ? args.referrerProjectId
      : null;

  const { data: existing } = await fromCreatorServiceViews()
    .select("viewer_id, referrer_project_id")
    .eq("viewer_id", args.viewerId)
    .eq("service_id", args.serviceId)
    .maybeSingle();

  const row = existing as { viewer_id?: string; referrer_project_id?: string | null } | null;
  if (row?.viewer_id) {
    const patch: Record<string, unknown> = {
      viewed_at: new Date().toISOString(),
    };
    // First-touch: keep existing referrer if already set.
    if (!row.referrer_project_id && referrer) {
      patch.referrer_project_id = referrer;
    }
    await fromCreatorServiceViews()
      .update(patch)
      .eq("viewer_id", args.viewerId)
      .eq("service_id", args.serviceId);
    return;
  }

  await fromCreatorServiceViews().insert({
    viewer_id: args.viewerId,
    service_id: args.serviceId,
    viewed_at: new Date().toISOString(),
    referrer_project_id: referrer,
  });
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
