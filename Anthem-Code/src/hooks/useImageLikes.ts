import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useIsImageLiked = (projectId: string | undefined, imageUrl: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["image-like", user?.id, projectId, imageUrl],
    enabled: !!user?.id && !!projectId && !!imageUrl,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_likes")
        .select("user_id")
        .eq("user_id", user!.id)
        .eq("project_id", projectId!)
        .eq("image_url", imageUrl!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
};

export const useToggleImageLike = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, imageUrl, liked }: { projectId: string; imageUrl: string; liked: boolean }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบก่อน");
      if (liked) {
        const { error } = await supabase
          .from("image_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("project_id", projectId)
          .eq("image_url", imageUrl);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("image_likes")
          .insert({ user_id: user.id, project_id: projectId, image_url: imageUrl });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["image-like", user?.id, vars.projectId, vars.imageUrl] });
      qc.invalidateQueries({ queryKey: ["image-stats", vars.projectId, vars.imageUrl] });
    },
  });
};
