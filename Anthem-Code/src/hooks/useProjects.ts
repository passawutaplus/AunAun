import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate, Tables } from "@/integrations/supabase/types";
import { PROJECT_FEED_SELECT } from "@/lib/dbSelects";
import { fetchProjectRow, fetchProjectRows } from "@/lib/fetchProjectRow";
import { blendPersonalizedProjects, resolveTopCategories } from "@/lib/forYouBlend";
import { getFeedSearchCategoryWeights } from "@/lib/feedSearchSignals";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import {
  isSchemaAiDisclosureError,
  isSchemaClientPermissionError,
  isSchemaContentPresentationError,
  stripOptionalAiDisclosureFields,
  stripOptionalClientPermissionFields,
  stripOptionalProjectContentFields,
} from "@/lib/projectContentBlocks";

export type DBProject = Tables<"projects">;

async function writeProjectRow(
  mode: "insert" | "update",
  args: { row?: TablesInsert<"projects">; id?: string; patch?: TablesUpdate<"projects"> },
): Promise<DBProject> {
  const attempt = async (payload: TablesInsert<"projects"> | TablesUpdate<"projects">) => {
    if (mode === "insert") {
      const row = { ...(payload as TablesInsert<"projects">), id: (payload as TablesInsert<"projects">).id ?? crypto.randomUUID() };
      const { error } = await supabase.from("projects").insert(row);
      if (error) throw error;
      const data = await fetchProjectRow(row.id);
      if (!data?.id) throw new Error("PROJECT_ID_MISSING");
      return data;
    }
    const { error } = await supabase.from("projects").update(payload).eq("id", args.id!);
    if (error) throw error;
    const data = await fetchProjectRow(args.id!);
    if (!data?.id) throw new Error("PROJECT_ID_MISSING");
    return data;
  };

  const payload = mode === "insert" ? args.row! : args.patch!;
  try {
    return await attempt(payload);
  } catch (e) {
    if (isSchemaClientPermissionError(e)) {
      console.warn("[projects] client permission column missing — saving without it", e);
      return await attempt(stripOptionalClientPermissionFields(payload as Record<string, unknown>));
    }
    if (isSchemaAiDisclosureError(e)) {
      console.warn("[projects] ai disclosure columns missing — saving without them", e);
      return await attempt(stripOptionalAiDisclosureFields(payload as Record<string, unknown>));
    }
    if (isSchemaContentPresentationError(e)) {
      console.warn(
        "[projects] content_blocks columns missing — saving without module layout (images only)",
        e,
      );
      return await attempt(stripOptionalProjectContentFields(payload as Record<string, unknown>));
    }
    throw e;
  }
}

const PUBLISHED_LIST_LIMIT = 120;
const TOP_LIST_LIMIT = 200;
const FOR_YOU_LIMIT = 80;
const EXPLORE_RECENT_FILL = 40;

async function fetchRecentPublished(limit: number): Promise<DBProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_FEED_SELECT)
    .eq("status", "Published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DBProject[];
}

/** Keep personalized order but ensure fresh + own published work always surfaces. */
function mergeExploreFeed(
  personalized: DBProject[],
  recent: DBProject[],
  ownPublished: DBProject[],
): DBProject[] {
  const byId = new Map<string, DBProject>();
  for (const p of [...ownPublished, ...personalized, ...recent]) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  const ordered: DBProject[] = [];
  const seen = new Set<string>();
  for (const p of [...ownPublished, ...personalized, ...recent]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    ordered.push(byId.get(p.id)!);
  }
  return ordered;
}

export const useMyProjects = (userId: string | undefined) =>
  useQuery({
    queryKey: ["my-projects", userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchProjectRows((select) =>
        supabase
          .from("projects")
          .select(select)
          .eq("owner_id", userId)
          .order("is_pinned", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
      );
    },
    enabled: !!userId,
  });

export const usePublishedProjects = () =>
  useQuery({
    queryKey: ["published-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("status", "Published")
        .order("created_at", { ascending: false })
        .limit(PUBLISHED_LIST_LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useTopProjects = () =>
  useQuery({
    queryKey: ["top-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("status", "Published")
        .order("likes", { ascending: false })
        .order("views", { ascending: false })
        .limit(TOP_LIST_LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useFollowingProjects = (userId: string | undefined) =>
  useQuery({
    queryKey: ["following-projects", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: follows, error: fErr } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId!);
      if (fErr) throw fErr;
      const ids = (follows ?? []).map((f) => f.following_id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("status", "Published")
        .in("owner_id", ids)
        .order("created_at", { ascending: false })
        .limit(PUBLISHED_LIST_LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useForYouProjects = (userId: string | undefined) =>
  useQuery({
    queryKey: ["for-you-projects", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [viewsRes, bookmarksRes, likesRes, imgLikesRes, profileRes] = await Promise.all([
        supabase.from("project_views").select("project_id").eq("user_id", userId!).order("viewed_at", { ascending: false }).limit(100),
        supabase.from("project_bookmarks").select("project_id").eq("user_id", userId!),
        supabase.from("project_likes").select("project_id").eq("user_id", userId!),
        supabase.from("image_likes").select("project_id").eq("user_id", userId!).order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("feed_interests").eq("user_id", userId!).maybeSingle(),
      ]);

      const feedInterests = (profileRes.data?.feed_interests ?? []) as string[];
      const searchCategoryWeights = getFeedSearchCategoryWeights(userId!);

      const likedIds = new Set<string>([
        ...(likesRes.data ?? []).map((r) => r.project_id),
        ...(imgLikesRes.data ?? []).map((r) => r.project_id),
      ]);
      const seenIds = new Set<string>([
        ...(viewsRes.data ?? []).map((r) => r.project_id),
        ...(bookmarksRes.data ?? []).map((r) => r.project_id),
        ...likedIds,
      ]);

      let aiRecs: DBProject[] = [];
      if (likedIds.size > 0) {
        const { data: recIds, error: recErr } = await supabase.rpc("recommend_from_likes", {
          _user_id: userId!,
          _limit: 40,
        });
        if (!recErr) {
          const ids = (recIds ?? []).map((r: { id: string }) => r.id);
          if (ids.length) {
            const { data: full } = await supabase.from("projects").select(PROJECT_FEED_SELECT).in("id", ids);
            const orderMap = new Map(ids.map((id, i) => [id, i]));
            aiRecs = (full ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
          }
        } else if (!isOptionalQueryError(recErr)) {
          throw recErr;
        }
      }

      const behaviorCategories: string[] = [];
      if (seenIds.size > 0) {
        const { data: signalProjects } = await supabase
          .from("projects")
          .select("category")
          .in("id", Array.from(seenIds));
        (signalProjects ?? []).forEach((p) => {
          if (p.category) behaviorCategories.push(p.category);
        });
      }

      const topCats = resolveTopCategories({
        behaviorCategories,
        feedInterests,
        searchCategoryWeights,
      });

      if (!seenIds.size && aiRecs.length === 0) {
        let personalized: DBProject[] = [];
        if (topCats.length > 0) {
          const { data, error } = await supabase
            .from("projects")
            .select(PROJECT_FEED_SELECT)
            .eq("status", "Published")
            .in("category", topCats)
            .order("likes", { ascending: false })
            .limit(FOR_YOU_LIMIT);
          if (error) throw error;
          personalized = (data ?? []) as DBProject[];
        } else {
          const { data, error } = await supabase
            .from("projects")
            .select(PROJECT_FEED_SELECT)
            .eq("status", "Published")
            .order("created_at", { ascending: false })
            .limit(60);
          if (error) throw error;
          personalized = (data ?? []) as DBProject[];
        }
        const [recentPublished, ownPublishedRes] = await Promise.all([
          fetchRecentPublished(EXPLORE_RECENT_FILL),
          supabase
            .from("projects")
            .select(PROJECT_FEED_SELECT)
            .eq("status", "Published")
            .eq("owner_id", userId!)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        if (ownPublishedRes.error) throw ownPublishedRes.error;
        return mergeExploreFeed(
          personalized,
          recentPublished,
          (ownPublishedRes.data ?? []) as DBProject[],
        );
      }

      const query = supabase.from("projects").select(PROJECT_FEED_SELECT).eq("status", "Published");
      const { data: catBased, error } = topCats.length
        ? await query.in("category", topCats).order("likes", { ascending: false }).limit(FOR_YOU_LIMIT)
        : await query.order("created_at", { ascending: false }).limit(60);
      if (error) throw error;

      const blended = blendPersonalizedProjects(aiRecs, (catBased ?? []) as DBProject[], seenIds);

      const [recentPublished, ownPublishedRes] = await Promise.all([
        fetchRecentPublished(EXPLORE_RECENT_FILL),
        supabase
          .from("projects")
          .select(PROJECT_FEED_SELECT)
          .eq("status", "Published")
          .eq("owner_id", userId!)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (ownPublishedRes.error) throw ownPublishedRes.error;

      return mergeExploreFeed(
        blended,
        recentPublished,
        (ownPublishedRes.data ?? []) as DBProject[],
      );
    },
  });



export const useProject = (id: string | undefined) =>
  useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchProjectRow(id);
    },
    enabled: !!id,
  });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"projects">) => writeProjectRow("insert", { row: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-projects"] });
      qc.invalidateQueries({ queryKey: ["published-projects"] });
      qc.invalidateQueries({ queryKey: ["drill-gallery"] });
      qc.invalidateQueries({ queryKey: ["for-you-projects"] });
      qc.invalidateQueries({ queryKey: ["top-projects"] });
    },
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"projects"> }) =>
      writeProjectRow("update", { id, patch }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["my-projects"] });
      qc.invalidateQueries({ queryKey: ["published-projects"] });
      qc.invalidateQueries({ queryKey: ["for-you-projects"] });
      qc.invalidateQueries({ queryKey: ["top-projects"] });
      qc.invalidateQueries({ queryKey: ["project", vars.id] });
    },
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-projects"] });
      qc.invalidateQueries({ queryKey: ["published-projects"] });
      qc.invalidateQueries({ queryKey: ["drill-gallery"] });
      qc.invalidateQueries({ queryKey: ["for-you-projects"] });
      qc.invalidateQueries({ queryKey: ["top-projects"] });
    },
  });
};
