import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useAuthDialog } from "@/stores/authDialogStore";
import { notifyCommunityEvent } from "@/lib/communityNotify";
import { enrichCommunityPosts, type CommunityPost } from "@/hooks/useCommunityPosts";

const promptAuth = () => {
  toast.info("กรุณาเข้าสู่ระบบก่อน");
  useAuthDialog.getState().openSignup();
};

export const useCommunityPostLike = (
  postId: string | undefined,
  likeCount = 0,
  meta?: { authorId?: string; title?: string },
) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const isLikedQ = useQuery({
    queryKey: ["community-post-liked", postId, user?.id],
    enabled: !!postId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_post_likes")
        .select("post_id")
        .eq("post_id", postId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !postId) {
        promptAuth();
        throw new Error("unauth");
      }
      if (isLikedQ.data) {
        const { error } = await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_post_likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
        if (meta?.authorId && meta.authorId !== user.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", user.id)
            .maybeSingle();
          await notifyCommunityEvent({
            recipientId: meta.authorId,
            kind: "community_like",
            title: "มีคนถูกใจโพสต์ของคุณ",
            body: `${prof?.display_name ?? "มีคนถูกใจ"} ถูกใจ "${meta.title ?? "โพสต์"}"`,
            link: `/community/${postId}`,
            metadata: { post_id: postId },
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-post-liked", postId, user?.id] });
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      qc.invalidateQueries({ queryKey: ["community-post", postId] });
    },
  });

  return {
    likes: likeCount,
    isLiked: !!isLikedQ.data,
    toggle: toggle.mutate,
    isPending: toggle.isPending,
  };
};

export const useCommunityPostBookmark = (postId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const isBookmarkedQ = useQuery({
    queryKey: ["community-post-bookmarked", postId, user?.id],
    enabled: !!postId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_post_bookmarks")
        .select("post_id")
        .eq("post_id", postId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !postId) {
        promptAuth();
        throw new Error("unauth");
      }
      if (isBookmarkedQ.data) {
        const { error } = await supabase
          .from("community_post_bookmarks")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("เอาออกจากที่บันทึกแล้ว");
      } else {
        const { error } = await supabase
          .from("community_post_bookmarks")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
        toast.success("บันทึกโพสต์แล้ว");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-post-bookmarked", postId, user?.id] });
      qc.invalidateQueries({ queryKey: ["community-saved-posts", user?.id] });
    },
  });

  return {
    isBookmarked: !!isBookmarkedQ.data,
    toggle: toggle.mutate,
    isPending: toggle.isPending,
  };
};

export const useSavedCommunityPosts = (userId: string | undefined) =>
  useQuery({
    queryKey: ["community-saved-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_post_bookmarks")
        .select("post_id, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.post_id);
      if (!ids.length) return [];
      const { data: posts, error: pErr } = await supabase
        .from("community_posts")
        .select(
          "id, author_id, post_kind, title, body, category, tags, gallery_urls, video_urls, question_topic, status, reply_count, like_count, view_count, created_at, updated_at",
        )
        .in("id", ids)
        .eq("status", "published");
      if (pErr) throw pErr;
      const order = new Map(ids.map((id, i) => [id, i]));
      const sorted = (posts ?? []).sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      ) as CommunityPost[];
      return enrichCommunityPosts(sorted);
    },
  });

export const useUserBlocks = (userId: string | undefined) =>
  useQuery({
    queryKey: ["user-blocks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.blocked_id));
    },
  });

export const useBlockUser = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-blocks", user?.id] });
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("บล็อกผู้ใช้แล้ว");
    },
  });
};
