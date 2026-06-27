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
  const { data, error } = await supabase
    .from("collection_items")
    .select("collection_id, added_at, projects:project_id(cover_url, gallery_urls)")
    .in("collection_id", collectionIds)
    .order("added_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, string[]> = {};
  (data ?? []).forEach((row: any) => {
    const arr = map[row.collection_id] ?? (map[row.collection_id] = []);
    if (arr.length >= 4) return;
    const url = row.projects?.cover_url || row.projects?.gallery_urls?.[0];
    if (url) arr.push(url);
  });
  return map;
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
      const coverMap = await fetchCovers((data ?? []).map((c) => c.id));
      return (data ?? []).map((c) => ({ ...c, covers: coverMap[c.id] ?? [] }));
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
      const coverMap = await fetchCovers((data ?? []).map((c) => c.id));
      return (data ?? []).map((c) => ({ ...c, covers: coverMap[c.id] ?? [] }));
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
      const { data, error } = await supabase
        .from("collection_items")
        .select("project_id, added_at, projects:project_id(*)")
        .eq("collection_id", collectionId!)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => r.projects)
        .filter((p: any) => p);
    },
  });

export const useProjectCollectionIds = (projectId: string | undefined, ownerId: string | undefined) =>
  useQuery({
    queryKey: ["project-in-collections", projectId, ownerId],
    enabled: !!projectId && !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("collection_id, collections:collection_id!inner(owner_id)")
        .eq("project_id", projectId!)
        .eq("collections.owner_id", ownerId!);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.collection_id as string));
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
          is_public: input.isPublic ?? true,
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
        return "removed" as const;
      }
      const { error } = await supabase.from("collection_items").insert({
        collection_id: input.collectionId,
        project_id: input.projectId ?? null,
        community_post_id: input.communityPostId ?? null,
      });
      if (error && !`${error.message}`.includes("duplicate")) throw error;
      return "added" as const;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["collections"] });
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("collection_id, collections:collection_id!inner(owner_id)")
        .eq("community_post_id", postId!)
        .eq("collections.owner_id", ownerId!);
      if (error) throw error;
      return new Set((data ?? []).map((r: { collection_id: string }) => r.collection_id));
    },
  });
