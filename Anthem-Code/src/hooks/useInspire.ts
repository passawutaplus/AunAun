import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInspireBoards = (userId: string | undefined) =>
  useQuery({
    queryKey: ["inspire-boards", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspire_boards")
        .select("*")
        .eq("owner_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { data, error } = await supabase
        .from("inspire_boards")
        .insert({ owner_id: userId, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspire-boards", userId] }),
  });
};

export const useAddToInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId, imageUrl }: { boardId: string; projectId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from("inspire_items")
        .insert({ board_id: boardId, project_id: projectId, image_url: imageUrl });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-items", vars.boardId] });
    },
  });
};

export const useInspireBoard = (boardId: string | undefined) =>
  useQuery({
    queryKey: ["inspire-board", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspire_boards")
        .select("*")
        .eq("id", boardId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useInspireBoardItems = (boardId: string | undefined) =>
  useQuery({
    queryKey: ["inspire-items", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspire_items")
        .select("*")
        .eq("board_id", boardId!)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useRemoveFromInspireBoard = (boardId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("inspire_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspire-items", boardId] }),
  });
};

export const useDeleteInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase.from("inspire_boards").delete().eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspire-boards", userId] }),
  });
};
