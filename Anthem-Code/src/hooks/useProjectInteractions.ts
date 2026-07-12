import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useAuthDialog } from "@/stores/authDialogStore";

const promptAuth = () => {
  toast.info("กรุณาเข้าสู่ระบบก่อน");
  useAuthDialog.getState().openSignup();
};

export const useProjectLike = (projectId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const countQ = useQuery({
    queryKey: ["project-like-count", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { count } = await supabase
        .from("project_likes")
        .select("project_id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      return count ?? 0;
    },
  });

  const isLikedQ = useQuery({
    queryKey: ["project-liked", projectId, user?.id],
    enabled: !!projectId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_likes")
        .select("project_id")
        .eq("project_id", projectId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  // No Realtime channel here: many cards may mount with the same projectId
  // and reusing a subscribed channel throws after subscribe().

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) {
        promptAuth();
        throw new Error("unauth");
      }
      if (isLikedQ.data) {
        const { error } = await supabase
          .from("project_likes")
          .delete()
          .eq("project_id", projectId!)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_likes")
          .insert({ project_id: projectId!, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-like-count", projectId] });
      qc.invalidateQueries({ queryKey: ["project-liked", projectId, user?.id] });
      if (user?.id) {
        qc.invalidateQueries({ queryKey: ["onboarding-checklist", user.id] });
      }
    },
  });

  return {
    likes: countQ.data ?? 0,
    isLiked: !!isLikedQ.data,
    toggle: toggle.mutate,
    canInteract: !!user,
  };
};

export const useProjectBookmark = (projectId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();



  const isBookmarkedQ = useQuery({
    queryKey: ["project-bookmarked", projectId, user?.id],
    enabled: !!projectId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_bookmarks")
        .select("project_id")
        .eq("project_id", projectId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) {
        promptAuth();
        throw new Error("unauth");
      }
      if (isBookmarkedQ.data) {
        const { error } = await supabase
          .from("project_bookmarks")
          .delete()
          .eq("project_id", projectId!)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("เอาออกจากที่บันทึกแล้ว");
      } else {
        const { error } = await supabase
          .from("project_bookmarks")
          .insert({ project_id: projectId!, user_id: user.id });
        if (error) throw error;
        toast.success("บันทึกผลงานแล้ว");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-bookmarked", projectId, user?.id] });
      qc.invalidateQueries({ queryKey: ["bookmarked-projects", user?.id] });
    },
  });

  return {
    isBookmarked: !!isBookmarkedQ.data,
    toggle: toggle.mutate,
    canInteract: !!user,
  };
};

export const useBookmarkedProjects = (userId: string | undefined) =>
  useQuery({
    queryKey: ["bookmarked-projects", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_bookmarks")
        .select("project_id, created_at, projects:project_id(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.projects)
        .filter((p: any) => p && p.status === "Published");
    },
  });
