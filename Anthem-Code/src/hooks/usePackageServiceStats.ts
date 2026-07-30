import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fromCreatorServiceViews } from "@/lib/creatorServicesDb";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import { EMPTY_PACKAGE_STATS, type PackageManageStats } from "@/hooks/usePackageManageStats";
import type { ProjectViewSeriesPayload } from "@/hooks/usePortfolioProjectStats";

export type PackageReferrerProjectStat = {
  projectId: string;
  title: string;
  coverUrl: string | null;
  viewCount: number;
  hireCount: number;
};

export type PackageServiceDetailStats = {
  viewCount: number;
  hireCount: number;
  allTimeViewCount: number;
  allTimeHireCount: number;
  referrers: PackageReferrerProjectStat[];
  hireWithoutProject: number;
  viewWithoutProject: number;
};

export type PackageServiceMetric = "views" | "hires";

export type PackageServiceMetricSeriesPayload = Record<
  PackageServiceMetric,
  ProjectViewSeriesPayload
>;

export const EMPTY_PACKAGE_SERVICE_METRIC_SERIES: PackageServiceMetricSeriesPayload = {
  views: { current: [], previous: [] },
  hires: { current: [], previous: [] },
};

export const EMPTY_PACKAGE_SERVICE_DETAIL_STATS: PackageServiceDetailStats = {
  viewCount: 0,
  hireCount: 0,
  allTimeViewCount: 0,
  allTimeHireCount: 0,
  referrers: [],
  hireWithoutProject: 0,
  viewWithoutProject: 0,
};

function swallowError(error: unknown): boolean {
  return isBenignQueryError(error as { message?: string; code?: string });
}

function previousWindow(fromIso: string, toIso: string): { from: string; to: string } {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const spanMs = Math.max(0, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);
  return { from: previousFrom.toISOString(), to: previousTo.toISOString() };
}

async function fetchViewTimestamps(
  serviceId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const res = await fromCreatorServiceViews()
    .select("viewed_at")
    .eq("service_id", serviceId)
    .gte("viewed_at", fromIso)
    .lte("viewed_at", toIso)
    .order("viewed_at", { ascending: true });
  if (res.error && !swallowError(res.error)) throw res.error;
  return ((res.data ?? []) as { viewed_at: string }[])
    .map((r) => r.viewed_at)
    .filter((v): v is string => typeof v === "string");
}

async function fetchHireTimestamps(
  serviceId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const res = await supabase
    .from("hiring_requests")
    .select("created_at")
    .eq("service_id", serviceId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  if (res.error && !swallowError(res.error)) throw res.error;
  return ((res.data ?? []) as { created_at: string | null }[])
    .map((r) => r.created_at)
    .filter((v): v is string => typeof v === "string");
}

/** Per-package view + hire counts for dashboard cards. */
export function usePackageStatsByService(ownerId: string | undefined, serviceIds: string[]) {
  const stableIds = serviceIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["package-stats-by-service", ownerId, stableIds],
    enabled: !!ownerId && serviceIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, PackageManageStats>> => {
      const [viewsRes, hiresRes] = await Promise.all([
        fromCreatorServiceViews()
          .select("service_id")
          .in("service_id", serviceIds),
        supabase.from("hiring_requests").select("service_id").in("service_id", serviceIds),
      ]);

      if (viewsRes.error && !swallowError(viewsRes.error)) throw viewsRes.error;
      if (hiresRes.error && !swallowError(hiresRes.error)) throw hiresRes.error;

      const map: Record<string, PackageManageStats> = {};
      for (const id of serviceIds) {
        map[id] = { ...EMPTY_PACKAGE_STATS };
      }
      for (const row of (viewsRes.data ?? []) as { service_id: string }[]) {
        const cur = map[row.service_id] ?? { ...EMPTY_PACKAGE_STATS };
        cur.viewCount += 1;
        map[row.service_id] = cur;
      }
      for (const row of (hiresRes.data ?? []) as { service_id: string | null }[]) {
        if (!row.service_id) continue;
        const cur = map[row.service_id] ?? { ...EMPTY_PACKAGE_STATS };
        cur.hireCount += 1;
        map[row.service_id] = cur;
      }
      return map;
    },
    placeholderData: {},
  });
}

async function buildReferrers(
  ownerId: string,
  serviceId: string,
  fromIso?: string,
  toIso?: string,
): Promise<
  Pick<
    PackageServiceDetailStats,
    "referrers" | "hireWithoutProject" | "viewWithoutProject" | "viewCount" | "hireCount"
  >
> {
  let viewsQuery = fromCreatorServiceViews()
    .select("referrer_project_id, viewed_at")
    .eq("service_id", serviceId);
  let hiresQuery = supabase
    .from("hiring_requests")
    .select("project_id, created_at")
    .eq("service_id", serviceId);

  if (fromIso && toIso) {
    viewsQuery = viewsQuery.gte("viewed_at", fromIso).lte("viewed_at", toIso);
    hiresQuery = hiresQuery.gte("created_at", fromIso).lte("created_at", toIso);
  }

  const [viewsRes, hiresRes] = await Promise.all([viewsQuery, hiresQuery]);
  if (viewsRes.error && !swallowError(viewsRes.error)) throw viewsRes.error;
  if (hiresRes.error && !swallowError(hiresRes.error)) throw hiresRes.error;

  const views = (viewsRes.data ?? []) as { referrer_project_id: string | null }[];
  const hires = (hiresRes.data ?? []) as { project_id: string | null }[];

  const viewByProject = new Map<string, number>();
  let viewWithoutProject = 0;
  for (const row of views) {
    const pid = row.referrer_project_id?.trim();
    if (!pid) {
      viewWithoutProject += 1;
      continue;
    }
    viewByProject.set(pid, (viewByProject.get(pid) ?? 0) + 1);
  }

  const hireByProject = new Map<string, number>();
  let hireWithoutProject = 0;
  for (const row of hires) {
    const pid = row.project_id?.trim();
    if (!pid) {
      hireWithoutProject += 1;
      continue;
    }
    hireByProject.set(pid, (hireByProject.get(pid) ?? 0) + 1);
  }

  const projectIds = Array.from(new Set([...viewByProject.keys(), ...hireByProject.keys()]));
  let projects: { id: string; title: string | null; cover_url: string | null }[] = [];
  if (projectIds.length > 0) {
    const projRes = await supabase
      .from("projects")
      .select("id, title, cover_url")
      .in("id", projectIds)
      .eq("owner_id", ownerId);
    if (projRes.error && !swallowError(projRes.error)) throw projRes.error;
    projects = (projRes.data ?? []) as typeof projects;
  }

  const byId = new Map(projects.map((p) => [p.id, p]));
  const referrers: PackageReferrerProjectStat[] = projectIds
    .map((id) => {
      const p = byId.get(id);
      return {
        projectId: id,
        title: p?.title?.trim() || "ผลงานที่ถูกลบหรือไม่มีสิทธิ์ดู",
        coverUrl: p?.cover_url ?? null,
        viewCount: viewByProject.get(id) ?? 0,
        hireCount: hireByProject.get(id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.viewCount + b.hireCount * 3 - (a.viewCount + a.hireCount * 3) ||
        a.title.localeCompare(b.title, "th"),
    );

  return {
    viewCount: views.length,
    hireCount: hires.length,
    referrers,
    hireWithoutProject,
    viewWithoutProject,
  };
}

/** Detail stats for one package in a date range — includes project attribution. */
export function usePackageServiceDetailStats(
  ownerId: string | undefined,
  serviceId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["package-service-detail-stats", ownerId, serviceId, fromIso, toIso],
    enabled: enabled && !!ownerId && !!serviceId && !!fromIso && !!toIso,
    staleTime: 20_000,
    placeholderData: EMPTY_PACKAGE_SERVICE_DETAIL_STATS,
    queryFn: async (): Promise<PackageServiceDetailStats> => {
      const [ranged, allViews, allHires] = await Promise.all([
        buildReferrers(ownerId!, serviceId!, fromIso, toIso),
        fromCreatorServiceViews()
          .select("*", { count: "exact", head: true })
          .eq("service_id", serviceId!),
        supabase
          .from("hiring_requests")
          .select("*", { count: "exact", head: true })
          .eq("service_id", serviceId!),
      ]);

      if (allViews.error && !swallowError(allViews.error)) throw allViews.error;
      if (allHires.error && !swallowError(allHires.error)) throw allHires.error;

      return {
        ...ranged,
        allTimeViewCount: allViews.count ?? 0,
        allTimeHireCount: allHires.count ?? 0,
      };
    },
  });
}

export function usePackageServiceMetricSeries(
  ownerId: string | undefined,
  serviceId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["package-service-metric-series", ownerId, serviceId, fromIso, toIso],
    enabled: enabled && !!ownerId && !!serviceId && !!fromIso && !!toIso,
    staleTime: 30_000,
    placeholderData: EMPTY_PACKAGE_SERVICE_METRIC_SERIES,
    queryFn: async (): Promise<PackageServiceMetricSeriesPayload> => {
      const prev = previousWindow(fromIso!, toIso!);
      const [viewsCurrent, viewsPrevious, hiresCurrent, hiresPrevious] = await Promise.all([
        fetchViewTimestamps(serviceId!, fromIso!, toIso!),
        fetchViewTimestamps(serviceId!, prev.from, prev.to),
        fetchHireTimestamps(serviceId!, fromIso!, toIso!),
        fetchHireTimestamps(serviceId!, prev.from, prev.to),
      ]);
      return {
        views: { current: viewsCurrent, previous: viewsPrevious },
        hires: { current: hiresCurrent, previous: hiresPrevious },
      };
    },
  });
}
