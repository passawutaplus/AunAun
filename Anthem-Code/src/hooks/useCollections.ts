import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Collection = Tables<"collections">;
export type CollectionItem = Tables<"collection_items">;

export interface CollectionWithCovers extends Collection {
  covers: string[];
}

const fetchItemCounts = async (collectionIds: string[]): Promise<Record<string, number>> => {
  if (!collectionIds.length) return {};
  try {
    const { data, error } = await supabase
      .from("collection_items")
      .select("collection_id")
      .in("collection_id", collectionIds);
    if (error) return {};
    const map: Record<string, number> = {};
    (data ?? []).forEach((row: { collection_id: string }) => {
      map[row.collection_id] = (map[row.collection_id] ?? 0) + 1;
    });
    return map;
  } catch {
    return {};
  }
};

const fetchCovers = async (collectionIds: string[]): Promise<Record<string, string[]>> => {
  if (!collectionIds.length) return {};
  try {
    // No PostgREST embed: collection_items.project_id may lack an FK (embeds fail silently for UI).
    const { data: rows, error } = await supabase
      .from("collection_items")
      .select("collection_id, project_id, added_at")
      .in("collection_id", collectionIds)
      .order("added_at", { ascending: false });
    if (error) return {};
    const projectIds = [
      ...new Set(
        (rows ?? [])
          .map((r: { project_id: string | null }) => r.project_id)
          .filter((id): id is string => !!id),
      ),
    ];
    if (!projectIds.length) return {};
    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select("id, cover_url, gallery_urls")
      .in("id", projectIds);
    if (pErr) return {};
    const byId = new Map(
      (projects ?? []).map((p: { id: string; cover_url?: string | null; gallery_urls?: string[] | null }) => [p.id, p]),
    );
    const map: Record<string, string[]> = {};
    (rows ?? []).forEach((row: { collection_id: string; project_id: string | null }) => {
      const arr = map[row.collection_id] ?? (map[row.collection_id] = []);
      if (arr.length >= 4 || !row.project_id) return;
      const project = byId.get(row.project_id);
      const url = project?.cover_url || project?.gallery_urls?.[0];
      if (url) arr.push(url);
    });
    return map;
  } catch {
    return {};
  }
};

export const useCollections = (ownerId: string | undefined) =>
  useQuery({
    queryKey: ["collections", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CollectionWithCovers[]> => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", ownerId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((c) => c.id);
      const [coverMap, countMap] = await Promise.all([fetchCovers(ids), fetchItemCounts(ids)]);
      return (data ?? []).map((c) => ({
        ...c,
        item_count: countMap[c.id] ?? c.item_count ?? 0,
        covers: coverMap[c.id] ?? [],
      }));
    },
  });

export const usePublicCollections = (ownerId: string | undefined) =>
  useQuery({
    queryKey: ["collections-public", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CollectionWithCovers[]> => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", ownerId!)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((c) => c.id);
      const [coverMap, countMap] = await Promise.all([fetchCovers(ids), fetchItemCounts(ids)]);
      return (data ?? []).map((c) => ({
        ...c,
        item_count: countMap[c.id] ?? c.item_count ?? 0,
        covers: coverMap[c.id] ?? [],
      }));
    },
  });

export const useCollection = (id: string | undefined) =>
  useQuery({
    queryKey: ["collection", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCollectionItems = (collectionId: string | undefined) =>
  useQuery({
    queryKey: ["collection-items", collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      // Two-step fetch: PostgREST embed needs an FK on project_id which may be missing.
      const { data: rows, error } = await supabase
        .from("collection_items")
        .select("project_id, added_at")
        .eq("collection_id", collectionId!)
        .order("added_at", { ascending: false });
      if (error) throw error;
      const projectIds = [
        ...new Set(
          (rows ?? [])
            .map((r: { project_id: string | null }) => r.project_id)
            .filter((id): id is string => !!id),
        ),
      ];
      if (!projectIds.length) return [];
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds);
      if (pErr) throw pErr;
      const byId = new Map((projects ?? []).map((p: { id: string }) => [p.id, p]));
      return (rows ?? [])
        .map((r: { project_id: string | null }) => (r.project_id ? byId.get(r.project_id) : null))
        .filter((p): p is NonNullable<typeof p> => !!p);
    },
  });

export const useProjectCollectionIds = (projectId: string | undefined, ownerId: string | undefined) =>
  useQuery({
    queryKey: ["project-in-collections", projectId, ownerId],
    enabled: !!projectId && !!ownerId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("collection_id, collections:collection_id!inner(owner_id)")
        .eq("project_id", projectId!)
        .eq("collections.owner_id", ownerId!);
      if (error) throw error;
      return (data ?? []).map((r: { collection_id: string }) => r.collection_id);
    },
  });

export const useCreateCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ownerId: string;
      name: string;
      description?: string;
      category?: string;
      isPublic?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("collections")
        .insert({
          owner_id: input.ownerId,
          name: input.name,
          description: input.description ?? "",
          category: input.category ?? "",
          is_public: input.isPublic ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["collections", vars.ownerId] });
      qc.invalidateQueries({ queryKey: ["collections-public", vars.ownerId] });
    },
  });
};

export const useUpdateCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<Collection, "name" | "description" | "category" | "is_public" | "cover_url">>;
    }) => {
      const { error } = await supabase.from("collections").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
      qc.invalidateQueries({ queryKey: ["collections-public"] });
    },
  });
};

export const useDeleteCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collections-public"] });
      toast.success("ลบคอลเลกชันแล้ว");
    },
  });
};

export const useToggleCollectionItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      collectionId: string;
      projectId?: string;
      communityPostId?: string;
      remove?: boolean;
    }) => {
      if (!input.projectId && !input.communityPostId) {
        throw new Error("ต้องระบุ project หรือ community post");
      }
      if (input.remove) {
        let q = supabase.from("collection_items").delete().eq("collection_id", input.collectionId);
        if (input.projectId) q = q.eq("project_id", input.projectId);
        if (input.communityPostId) q = q.eq("community_post_id", input.communityPostId);
        const { error } = await q;
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collection_items").insert({
          collection_id: input.collectionId,
          project_id: input.projectId ?? null,
          community_post_id: input.communityPostId ?? null,
        });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      }

      const { count } = await supabase
        .from("collection_items")
        .select("collection_id", { count: "exact", head: true })
        .eq("collection_id", input.collectionId);
      await supabase
        .from("collections")
        .update({
          item_count: count ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.collectionId);

      return input.remove ? ("removed" as const) : ("added" as const);
    },
    onMutate: async (vars) => {
      if (!vars.projectId) return {};
      await qc.cancelQueries({ queryKey: ["project-in-collections", vars.projectId] });
      const previous = qc.getQueriesData<string[]>({ queryKey: ["project-in-collections", vars.projectId] });
      qc.setQueriesData<string[]>({ queryKey: ["project-in-collections", vars.projectId] }, (old) => {
        const list = old ?? [];
        if (vars.remove) return list.filter((id) => id !== vars.collectionId);
        return list.includes(vars.collectionId) ? list : [...list, vars.collectionId];
      });
      qc.setQueriesData<CollectionWithCovers[]>({ queryKey: ["collections"] }, (old) => {
        if (!old) return old;
        return old.map((c) => {
          if (c.id !== vars.collectionId) return c;
          const nextCount = Math.max(0, (c.item_count ?? 0) + (vars.remove ? -1 : 1));
          return { ...c, item_count: nextCount };
        });
      });
      return { previous };
    },
    onError: (_err, vars, ctx) => {
      if (!vars.projectId || !ctx?.previous) return;
      for (const [key, data] of ctx.previous) {
        qc.setQueryData(key, data);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collections-public"] });
      qc.invalidateQueries({ queryKey: ["collection", vars.collectionId] });
      qc.invalidateQueries({ queryKey: ["collection-items", vars.collectionId] });
      if (vars.projectId) {
        qc.invalidateQueries({ queryKey: ["project-in-collections", vars.projectId] });
      }
      if (vars.communityPostId) {
        qc.invalidateQueries({ queryKey: ["community-post-in-collections", vars.communityPostId] });
      }
    },
  });
};

export const useCommunityPostCollectionIds = (
  postId: string | undefined,
  ownerId: string | undefined,
) =>
  useQuery({
    queryKey: ["community-post-in-collections", postId, ownerId],
    enabled: !!postId && !!ownerId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("collection_id, collections:collection_id!inner(owner_id)")
        .eq("community_post_id", postId!)
        .eq("collections.owner_id", ownerId!);
      if (error) throw error;
      return (data ?? []).map((r: { collection_id: string }) => r.collection_id);
    },
  });
