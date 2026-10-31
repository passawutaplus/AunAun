import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Collection = Tables<"collections">;
export type CollectionItem = Tables<"collection_items">;

export interface CollectionWithCovers extends Collection {
  covers: string[];
}

const fetchCovers = async (collectionIds: string[]): Promise<Record<string, string[]>> => {
  if (!collectionIds.length) return {};
  try {
    // No PostgREST embed: collection_items.project_id may lack an FK (embeds fail silently for UI).
    const { data: rows, error } = await supabase
      .from("collection_items")
      .select("collection_id, project_id, added_at, position")
      .in("collection_id", collectionIds)
      .order("position", { ascending: true, nullsFirst: true })
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

/** A cover the owner picked wins; otherwise the mosaic of the first four works in the shown order. */
const withCovers = async (rows: Collection[]): Promise<CollectionWithCovers[]> => {
  const auto = await fetchCovers(rows.filter((c) => !c.cover_url).map((c) => c.id));
  return rows.map((c) => ({ ...c, covers: c.cover_url ? [c.cover_url] : (auto[c.id] ?? []) }));
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
      return withCovers(data ?? []);
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
      return withCovers(data ?? []);
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
        .select("project_id, added_at, position")
        .eq("collection_id", collectionId!)
        .order("position", { ascending: true, nullsFirst: true })
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
      // Rows arrive in the owner's order (new saves first). Keep added_at / position so the views
      // can also sort by save date, and so a reorder can be written back.
      return (rows ?? []).flatMap(
        (r: { project_id: string | null; added_at: string | null; position: number | null }) => {
          const project = r.project_id ? byId.get(r.project_id) : null;
          return project ? [{ ...project, added_at: r.added_at, position: r.position }] : [];
        },
      );
    },
  });

/** Project ids the user has in any collection. One shared query for cards and the work page. */
export const useSavedProjectIds = (ownerId: string | undefined) =>
  useQuery({
    queryKey: ["saved-project-ids", ownerId],
    enabled: !!ownerId,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data: collections, error } = await supabase
        .from("collections")
        .select("id")
        .eq("owner_id", ownerId!);
      if (error) throw error;
      const collectionIds = (collections ?? []).map((c: { id: string }) => c.id);
      if (!collectionIds.length) return [];
      const { data: items, error: itemError } = await supabase
        .from("collection_items")
        .select("project_id")
        .in("collection_id", collectionIds)
        .not("project_id", "is", null);
      if (itemError) throw itemError;
      return [
        ...new Set(
          (items ?? [])
            .map((r: { project_id: string | null }) => r.project_id)
            .filter((id): id is string => !!id),
        ),
      ];
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
        if (error && error.code !== "23505") throw error;
      }

      // item_count and updated_at are kept by the collection_items_count_* DB triggers.
      return input.remove ? ("removed" as const) : ("added" as const);
    },
    onMutate: async (vars) => {
      if (!vars.projectId) return {};
      await qc.cancelQueries({ queryKey: ["project-in-collections", vars.projectId] });
      await qc.cancelQueries({ queryKey: ["saved-project-ids"] });
      const previous = qc.getQueriesData<string[]>({ queryKey: ["project-in-collections", vars.projectId] });
      const previousSaved = qc.getQueriesData<string[]>({ queryKey: ["saved-project-ids"] });
      qc.setQueriesData<string[]>({ queryKey: ["project-in-collections", vars.projectId] }, (old) => {
        const list = old ?? [];
        if (vars.remove) return list.filter((id) => id !== vars.collectionId);
        return list.includes(vars.collectionId) ? list : [...list, vars.collectionId];
      });
      if (vars.projectId) {
        qc.setQueriesData<string[]>({ queryKey: ["saved-project-ids"] }, (old) => {
          if (!old) return old;
          if (!vars.remove) {
            return old.includes(vars.projectId!) ? old : [...old, vars.projectId!];
          }
          const lists = qc.getQueriesData<string[]>({
            queryKey: ["project-in-collections", vars.projectId],
          });
          const known = lists.filter((entry): entry is [(typeof entry)[0], string[]] => Array.isArray(entry[1]));
          const stillIn = known.some(([, ids]) => ids.length > 0);
          if (known.length > 0 && !stillIn) return old.filter((id) => id !== vars.projectId);
          return old;
        });
      }
      const previousCollections = qc.getQueriesData<CollectionWithCovers[]>({ queryKey: ["collections"] });
      qc.setQueriesData<CollectionWithCovers[]>({ queryKey: ["collections"] }, (old) => {
        if (!old) return old;
        return old.map((c) => {
          if (c.id !== vars.collectionId) return c;
          const nextCount = Math.max(0, (c.item_count ?? 0) + (vars.remove ? -1 : 1));
          return { ...c, item_count: nextCount };
        });
      });
      return { previous, previousSaved, previousCollections };
    },
    onError: (_err, vars, ctx) => {
      if (!vars.projectId) return;
      for (const [key, data] of ctx?.previous ?? []) {
        qc.setQueryData(key, data);
      }
      for (const [key, data] of ctx?.previousSaved ?? []) {
        qc.setQueryData(key, data);
      }
      for (const [key, data] of ctx?.previousCollections ?? []) {
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
        qc.invalidateQueries({ queryKey: ["saved-project-ids"] });
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

const invalidateCollectionItems = (qc: ReturnType<typeof useQueryClient>, collectionIds: string[]) => {
  qc.invalidateQueries({ queryKey: ["collections"] });
  qc.invalidateQueries({ queryKey: ["collections-public"] });
  qc.invalidateQueries({ queryKey: ["saved-project-ids"] });
  qc.invalidateQueries({ queryKey: ["project-in-collections"] });
  for (const id of collectionIds) {
    qc.invalidateQueries({ queryKey: ["collection", id] });
    qc.invalidateQueries({ queryKey: ["collection-items", id] });
  }
};

/** Save the owner's manual order. One upsert; relies on the owner UPDATE policy on collection_items. */
export const useReorderCollectionItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { collectionId: string; projectIds: string[] }) => {
      const rows = input.projectIds.map((project_id, position) => ({
        collection_id: input.collectionId,
        project_id,
        position,
      }));
      const { error } = await supabase
        .from("collection_items")
        .upsert(rows, { onConflict: "collection_id,project_id" });
      if (error) throw error;
    },
    onMutate: async (vars) => {
      const key = ["collection-items", vars.collectionId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<{ id: string }[]>(key);
      if (previous) {
        const byId = new Map(previous.map((p) => [p.id, p]));
        qc.setQueryData(
          key,
          vars.projectIds.flatMap((id, position) => {
            const item = byId.get(id);
            return item ? [{ ...item, position }] : [];
          }),
        );
      }
      return { previous };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["collection-items", vars.collectionId], ctx.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["collection-items", vars.collectionId] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
};

/** Take several works out of one collection in a single request. */
export const useRemoveCollectionItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { collectionId: string; projectIds: string[] }) => {
      if (!input.projectIds.length) return;
      const { error } = await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", input.collectionId)
        .in("project_id", input.projectIds);
      if (error) throw error;
    },
    onSuccess: (_, vars) => invalidateCollectionItems(qc, [vars.collectionId]),
  });
};

/** Copy or move works to another of the owner's collections (works already there are skipped). */
export const useTransferCollectionItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fromCollectionId: string;
      toCollectionId: string;
      projectIds: string[];
      mode: "copy" | "move";
    }) => {
      if (!input.projectIds.length || input.fromCollectionId === input.toCollectionId) return;
      const { error } = await supabase.from("collection_items").upsert(
        input.projectIds.map((project_id) => ({ collection_id: input.toCollectionId, project_id })),
        { onConflict: "collection_id,project_id", ignoreDuplicates: true },
      );
      if (error) throw error;
      if (input.mode === "move") {
        const { error: delError } = await supabase
          .from("collection_items")
          .delete()
          .eq("collection_id", input.fromCollectionId)
          .in("project_id", input.projectIds);
        if (delError) throw delError;
      }
    },
    onSuccess: (_, vars) => invalidateCollectionItems(qc, [vars.fromCollectionId, vars.toCollectionId]),
  });
};
