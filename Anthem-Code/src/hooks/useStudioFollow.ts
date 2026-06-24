import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useStudioFollowState = (studioId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const followers = useQuery({
    queryKey: ["studio-follow-count", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("studio_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("studio_id", studioId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const membership = useQuery({
    queryKey: ["studio-membership", studioId, user?.id],
    enabled: !!studioId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_members")
        .select("user_id")
        .eq("studio_id", studioId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const isFollowing = useQuery({
    queryKey: ["is-following-studio", studioId, user?.id],
    enabled: !!studioId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_follows")
        .select("follower_id")
        .eq("follower_id", user!.id)
        .eq("studio_id", studioId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !studioId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      if (isFollowing.data) {
        const { error } = await supabase
          .from("studio_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("studio_id", studioId);
        if (error) throw error;
        return { followed: false as const };
      }
      const { error } = await supabase
        .from("studio_follows")
        .insert({ follower_id: user.id, studio_id: studioId });
      if (error) throw error;
      return { followed: true as const };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-follow-count", studioId] });
      qc.invalidateQueries({ queryKey: ["is-following-studio", studioId, user?.id] });
    },
  });

  return {
    followers: followers.data ?? 0,
    isFollowing: !!isFollowing.data,
    isMember: !!membership.data,
    canFollow: !!user && !membership.data,
    toggle: toggle.mutate,
    isPending: toggle.isPending,
  };
};

export const useFollowedStudioIds = (userId: string | undefined) =>
  useQuery({
    queryKey: ["followed-studio-ids", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("studio_follows")
        .select("studio_id")
        .eq("follower_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.studio_id));
    },
  });
