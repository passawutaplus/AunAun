import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isBenignQueryError } from "@/lib/supabaseErrors";

export type ProjectManageStats = {
  views7d: number;
  views30d: number;
  hireCount: number;
  collabCount: number;
  bookmarkCount: number;
  collectionSaveCount: number;
  commentCount: number;
};

export type ProjectManageStatsInRange = {
  viewCount: number;
  likeCount: number;
  hireCount: number;
  collabCount: number;
  bookmarkCount: number;
  collectionSaveCount: number;
  commentCount: number;
};

export const EMPTY_PROJECT_STATS: ProjectManageStats = {
  views7d: 0,
  views30d: 0,
  hireCount: 0,
  collabCount: 0,
  bookmarkCount: 0,
  collectionSaveCount: 0,
  commentCount: 0,
};

export const EMPTY_PROJECT_STATS_IN_RANGE: ProjectManageStatsInRange = {
  viewCount: 0,
  likeCount: 0,
  hireCount: 0,
  collabCount: 0,
  bookmarkCount: 0,
  collectionSaveCount: 0,
  commentCount: 0,
};

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function fetchPortfolioProjectStats(
  ownerId: string,
  projectIds: string[],
): Promise<Record<string, ProjectManageStats>> {
  const base: Record<string, ProjectManageStats> = {};
  for (const id of projectIds) {
    base[id] = { ...EMPTY_PROJECT_STATS };
  }
  if (!projectIds.length) return base;

  const idSet = new Set(projectIds);
  const since7 = sinceIso(7);
  const since30 = sinceIso(30);

  const [
    views7Res,
    views30Res,
    hiresRes,
    collabsRes,
    bookmarksRes,
    collectionRes,
    commentsRes,
  ] = await Promise.all([
    supabase.from("project_views").select("project_id").in("project_id", projectIds).gte("viewed_at", since7),
    supabase.from("project_views").select("project_id").in("project_id", projectIds).gte("viewed_at", since30),
    supabase
      .from("hiring_requests")
      .select("project_id")
      .eq("freelancer_id", ownerId)
      .in("project_id", projectIds),
    supabase
      .from("collab_requests")
      .select("project_id, attached_project_ids")
      .eq("recipient_id", ownerId),
    supabase.from("project_bookmarks").select("project_id").in("project_id", projectIds),
    supabase.from("collection_items").select("project_id").in("project_id", projectIds),
    supabase.from("project_comments").select("project_id").in("project_id", projectIds),
  ]);

  const swallow = <T,>(res: { data: T | null; error: unknown }) => {
    if (res.error && !isBenignQueryError(res.error as { message?: string; code?: string })) {
      throw res.error;
    }
    return res.data ?? [];
  };

  for (const row of swallow(views7Res) as { project_id: string }[]) {
    if (base[row.project_id]) base[row.project_id].views7d += 1;
  }
  for (const row of swallow(views30Res) as { project_id: string }[]) {
    if (base[row.project_id]) base[row.project_id].views30d += 1;
  }
  for (const row of swallow(hiresRes) as { project_id: string }[]) {
    if (base[row.project_id]) base[row.project_id].hireCount += 1;
  }
  for (const row of swallow(collabsRes) as {
    project_id: string | null;
    attached_project_ids: string[] | null;
  }[]) {
    const matched = new Set<string>();
    if (row.project_id && idSet.has(row.project_id)) matched.add(row.project_id);
    for (const pid of row.attached_project_ids ?? []) {
      if (idSet.has(pid)) matched.add(pid);
    }
    for (const pid of matched) {
      if (base[pid]) base[pid].collabCount += 1;
    }
  }
  for (const row of swallow(bookmarksRes) as { project_id: string }[]) {
    if (base[row.project_id]) base[row.project_id].bookmarkCount += 1;
  }
  for (const row of swallow(collectionRes) as { project_id: string }[]) {
    if (base[row.project_id]) base[row.project_id].collectionSaveCount += 1;
  }
  for (const row of swallow(commentsRes) as { project_id: string }[]) {
    if (base[row.project_id]) base[row.project_id].commentCount += 1;
  }

  return base;
}

export async function fetchProjectManageStatsForRange(
  ownerId: string,
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<ProjectManageStatsInRange> {
  const stats: ProjectManageStatsInRange = { ...EMPTY_PROJECT_STATS_IN_RANGE };

  const [
    viewsRes,
    likesRes,
    hiresRes,
    collabsRes,
    bookmarksRes,
    collectionRes,
    commentsRes,
  ] = await Promise.all([
    supabase
      .from("project_views")
      .select("project_id")
      .eq("project_id", projectId)
      .gte("viewed_at", fromIso)
      .lte("viewed_at", toIso),
    supabase
      .from("project_likes")
      .select("project_id")
      .eq("project_id", projectId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("hiring_requests")
      .select("project_id")
      .eq("freelancer_id", ownerId)
      .eq("project_id", projectId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("collab_requests")
      .select("project_id, attached_project_ids")
      .eq("recipient_id", ownerId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("project_bookmarks")
      .select("project_id")
      .eq("project_id", projectId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("collection_items")
      .select("project_id")
      .eq("project_id", projectId)
      .gte("added_at", fromIso)
      .lte("added_at", toIso),
    supabase
      .from("project_comments")
      .select("project_id")
      .eq("project_id", projectId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
  ]);

  const swallow = <T,>(res: { data: T | null; error: unknown }) => {
    if (res.error && !isBenignQueryError(res.error as { message?: string; code?: string })) {
      throw res.error;
    }
    return res.data ?? [];
  };

  stats.viewCount = (swallow(viewsRes) as { project_id: string }[]).length;
  stats.likeCount = (swallow(likesRes) as { project_id: string }[]).length;
  stats.hireCount = (swallow(hiresRes) as { project_id: string }[]).length;

  for (const row of swallow(collabsRes) as {
    project_id: string | null;
    attached_project_ids: string[] | null;
  }[]) {
    const matched =
      row.project_id === projectId || (row.attached_project_ids ?? []).includes(projectId);
    if (matched) stats.collabCount += 1;
  }

  stats.bookmarkCount = (swallow(bookmarksRes) as { project_id: string }[]).length;
  stats.collectionSaveCount = (swallow(collectionRes) as { project_id: string }[]).length;
  stats.commentCount = (swallow(commentsRes) as { project_id: string }[]).length;

  return stats;
}

export async function fetchProjectViewTimestamps(
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_views")
    .select("viewed_at")
    .eq("project_id", projectId)
    .gte("viewed_at", fromIso)
    .lte("viewed_at", toIso)
    .order("viewed_at", { ascending: true });

  if (error && !isBenignQueryError(error as { message?: string; code?: string })) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.viewed_at)
    .filter((value): value is string => typeof value === "string");
}

export type ProjectViewSeriesPayload = {
  current: string[];
  previous: string[];
};

export type ProjectStatsMetric = "views" | "hires" | "collabs" | "likes" | "saves" | "comments";

export type ProjectMetricSeriesPayload = Record<ProjectStatsMetric, ProjectViewSeriesPayload>;

const emptySeriesPayload = (): ProjectViewSeriesPayload => ({ current: [], previous: [] });

export const EMPTY_PROJECT_METRIC_SERIES: ProjectMetricSeriesPayload = {
  views: emptySeriesPayload(),
  hires: emptySeriesPayload(),
  collabs: emptySeriesPayload(),
  likes: emptySeriesPayload(),
  saves: emptySeriesPayload(),
  comments: emptySeriesPayload(),
};

export async function fetchProjectViewSeriesPayload(
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<ProjectViewSeriesPayload> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const spanMs = Math.max(0, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);

  const [current, previous] = await Promise.all([
    fetchProjectViewTimestamps(projectId, fromIso, toIso),
    fetchProjectViewTimestamps(projectId, previousFrom.toISOString(), previousTo.toISOString()),
  ]);

  return { current, previous };
}

function pickCreatedAt<T extends { created_at?: string | null }>(rows: T[]): string[] {
  return rows
    .map((row) => row.created_at)
    .filter((value): value is string => typeof value === "string");
}

async function fetchProjectLikeTimestamps(projectId: string, fromIso: string, toIso: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_likes")
    .select("created_at")
    .eq("project_id", projectId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  if (error && !isBenignQueryError(error as { message?: string; code?: string })) throw error;
  return pickCreatedAt(data ?? []);
}

async function fetchProjectHireTimestamps(
  ownerId: string,
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("hiring_requests")
    .select("created_at")
    .eq("freelancer_id", ownerId)
    .eq("project_id", projectId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  if (error && !isBenignQueryError(error as { message?: string; code?: string })) throw error;
  return pickCreatedAt(data ?? []);
}

async function fetchProjectCollabTimestamps(
  ownerId: string,
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("collab_requests")
    .select("created_at, project_id, attached_project_ids")
    .eq("recipient_id", ownerId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  if (error && !isBenignQueryError(error as { message?: string; code?: string })) throw error;
  return (data ?? [])
    .filter((row) => row.project_id === projectId || (row.attached_project_ids ?? []).includes(projectId))
    .map((row) => row.created_at)
    .filter((value): value is string => typeof value === "string");
}

async function fetchProjectBookmarkTimestamps(projectId: string, fromIso: string, toIso: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_bookmarks")
    .select("created_at")
    .eq("project_id", projectId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  if (error && !isBenignQueryError(error as { message?: string; code?: string })) throw error;
  return pickCreatedAt(data ?? []);
}

async function fetchProjectCollectionSaveTimestamps(
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_items")
    .select("added_at")
    .eq("project_id", projectId)
    .gte("added_at", fromIso)
    .lte("added_at", toIso)
    .order("added_at", { ascending: true });
  if (error && !isBenignQueryError(error as { message?: string; code?: string })) throw error;
  return (data ?? [])
    .map((row) => row.added_at)
    .filter((value): value is string => typeof value === "string");
}

async function fetchProjectCommentTimestamps(projectId: string, fromIso: string, toIso: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_comments")
    .select("created_at")
    .eq("project_id", projectId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  if (error && !isBenignQueryError(error as { message?: string; code?: string })) throw error;
  return pickCreatedAt(data ?? []);
}

async function withPrevious(current: Promise<string[]>, previous: Promise<string[]>): Promise<ProjectViewSeriesPayload> {
  const [currentRows, previousRows] = await Promise.all([current, previous]);
  return { current: currentRows, previous: previousRows };
}

export async function fetchProjectMetricSeriesPayload(
  ownerId: string,
  projectId: string,
  fromIso: string,
  toIso: string,
): Promise<ProjectMetricSeriesPayload> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const spanMs = Math.max(0, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);
  const prevFromIso = previousFrom.toISOString();
  const prevToIso = previousTo.toISOString();

  const [views, hires, collabs, likes, bookmarks, collectionSaves, comments] = await Promise.all([
    fetchProjectViewSeriesPayload(projectId, fromIso, toIso),
    withPrevious(
      fetchProjectHireTimestamps(ownerId, projectId, fromIso, toIso),
      fetchProjectHireTimestamps(ownerId, projectId, prevFromIso, prevToIso),
    ),
    withPrevious(
      fetchProjectCollabTimestamps(ownerId, projectId, fromIso, toIso),
      fetchProjectCollabTimestamps(ownerId, projectId, prevFromIso, prevToIso),
    ),
    withPrevious(
      fetchProjectLikeTimestamps(projectId, fromIso, toIso),
      fetchProjectLikeTimestamps(projectId, prevFromIso, prevToIso),
    ),
    withPrevious(
      fetchProjectBookmarkTimestamps(projectId, fromIso, toIso),
      fetchProjectBookmarkTimestamps(projectId, prevFromIso, prevToIso),
    ),
    withPrevious(
      fetchProjectCollectionSaveTimestamps(projectId, fromIso, toIso),
      fetchProjectCollectionSaveTimestamps(projectId, prevFromIso, prevToIso),
    ),
    withPrevious(
      fetchProjectCommentTimestamps(projectId, fromIso, toIso),
      fetchProjectCommentTimestamps(projectId, prevFromIso, prevToIso),
    ),
  ]);

  return {
    views,
    hires,
    collabs,
    likes,
    saves: {
      current: [...bookmarks.current, ...collectionSaves.current],
      previous: [...bookmarks.previous, ...collectionSaves.previous],
    },
    comments,
  };
}

export function usePortfolioProjectStats(ownerId: string | undefined, projectIds: string[]) {
  const stableKey = projectIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["portfolio-project-stats", ownerId, stableKey],
    enabled: !!ownerId && projectIds.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchPortfolioProjectStats(ownerId!, projectIds),
  });
}

export function useProjectManageStatsForRange(
  ownerId: string | undefined,
  projectId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["project-manage-stats-range", ownerId, projectId, fromIso, toIso],
    enabled: enabled && !!ownerId && !!projectId && !!fromIso && !!toIso,
    staleTime: 30_000,
    queryFn: () => fetchProjectManageStatsForRange(ownerId!, projectId!, fromIso!, toIso!),
  });
}

export function useProjectViewSeries(
  projectId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["project-view-series", projectId, fromIso, toIso],
    enabled: enabled && !!projectId && !!fromIso && !!toIso,
    staleTime: 30_000,
    queryFn: () => fetchProjectViewSeriesPayload(projectId!, fromIso!, toIso!),
  });
}

export function useProjectMetricSeries(
  ownerId: string | undefined,
  projectId: string | undefined,
  fromIso: string | undefined,
  toIso: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["project-metric-series", ownerId, projectId, fromIso, toIso],
    enabled: enabled && !!ownerId && !!projectId && !!fromIso && !!toIso,
    staleTime: 30_000,
    queryFn: () => fetchProjectMetricSeriesPayload(ownerId!, projectId!, fromIso!, toIso!),
  });
}
