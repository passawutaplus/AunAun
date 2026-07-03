import { useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useAuthDialog } from "@/stores/authDialogStore";
import { notifyCommunityEvent } from "@/lib/communityNotify";
import { type CommunityPost } from "@/hooks/useCommunityPosts";

const promptAuth = () => {
  toast.info("กรุณาเข้าสู่ระบบก่อน");
  useAuthDialog.getState().openSignup();
};

type CommunityPostsPage = { items: CommunityPost[]; rawCount: number };

function adjustCommunityPostLikeCount(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  delta: number,
) {
  qc.setQueriesData<InfiniteData<CommunityPostsPage>>(
    { queryKey: ["community-posts"] },
    (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((p) =>
            p.id === postId
              ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) + delta) }
              : p,
          ),
        })),
      };
    },
  );

  qc.setQueryData<CommunityPost>(["community-post", postId], (old) =>
    old ? { ...old, like_count: Math.max(0, (old.like_count ?? 0) + delta) } : old,
  );

  qc.setQueriesData<CommunityPost[]>(
    { queryKey: ["community-posts-by-author"] },
    (old) =>
      old?.map((p) =>
        p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) + delta) } : p,
      ) ?? old,
  );
}

function readCommunityPostLiked(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  userId: string,
): boolean {
  return !!qc.getQueryData<boolean>(["community-post-liked", postId, userId]);
}

function readCommunityPostLikeCount(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  fallback: number,
): number {
  const detail = qc.getQueryData<CommunityPost>(["community-post", postId]);
  if (detail && typeof detail.like_count === "number") return detail.like_count;

  for (const [, data] of qc.getQueriesData<InfiniteData<CommunityPostsPage>>({
    queryKey: ["community-posts"],
  })) {
    for (const page of data?.pages ?? []) {
      const hit = page.items.find((p) => p.id === postId);
      if (hit && typeof hit.like_count === "number") return hit.like_count;
    }
  }

  for (const [, list] of qc.getQueriesData<CommunityPost[]>({
    queryKey: ["community-posts-by-author"],
  })) {
    const hit = list?.find((p) => p.id === postId);
    if (hit && typeof hit.like_count === "number") return hit.like_count;
  }

  return fallback;
}

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

  const { data: isLikedFromServer, isLoading: isLikedLoading } = isLikedQ;

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !postId) {
        promptAuth();
        throw new Error("unauth");
      }
      const liked = readCommunityPostLiked(qc, postId, user.id);
      if (liked) {
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
        if (error?.code === "23505") return;
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
            title: "มีคนให้ +1 โพสต์ของคุณ",
            body: `${prof?.display_name ?? "มีคน"} ให้ +1 "${meta.title ?? "โพสต์"}"`,
            link: `/community/${postId}`,
            metadata: { post_id: postId },
          });
        }
      }
    },
    onMutate: async () => {
      if (!postId || !user?.id) return;
      const wasLiked = readCommunityPostLiked(qc, postId, user.id);
      const delta = wasLiked ? -1 : 1;
      await qc.cancelQueries({ queryKey: ["community-post-liked", postId, user.id] });
      qc.setQueryData(["community-post-liked", postId, user.id], !wasLiked);
      adjustCommunityPostLikeCount(qc, postId, delta);
      const cached = qc.getQueryData<CommunityPost>(["community-post", postId]);
      const nextLikeCount =
        cached?.like_count ?? Math.max(0, likeCount + delta);
      return { wasLiked, nextLikeCount };
    },
    onError: (_err, _vars, ctx) => {
      if (!postId || !user?.id || !ctx) return;
      const delta = ctx.wasLiked ? 1 : -1;
      qc.setQueryData(["community-post-liked", postId, user.id], ctx.wasLiked);
      adjustCommunityPostLikeCount(qc, postId, delta);
    },
    onSuccess: (_data, _vars, ctx) => {
      if (postId && meta?.authorId && user?.id === meta.authorId && ctx && !ctx.wasLiked) {
        for (const milestone of [10, 25, 50]) {
          if (ctx.nextLikeCount === milestone) {
            void (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
              "record_community_engagement_milestone",
              {
                _post_id: postId,
                _kind: `likes_${milestone}`,
                _metadata: { count: ctx.nextLikeCount },
              },
            );
          }
        }
      }
      // Keep optimistic cache — refetching the feed here caused like state/count to flicker.
      if (user?.id) {
        qc.invalidateQueries({ queryKey: ["onboarding-checklist", user.id] });
      }
    },
  });

  const likedCache =
    postId && user?.id
      ? qc.getQueryData<boolean>(["community-post-liked", postId, user.id])
      : undefined;
  const isLiked = likedCache ?? !!isLikedFromServer;
  const likes = Math.max(0, readCommunityPostLikeCount(qc, postId ?? "", likeCount));
  const liking = toggle.isPending || (!!user && !!postId && isLikedLoading);

  const runToggle = () => {
    if (!user || !postId) {
      promptAuth();
      return;
    }
    if (liking) return;
    toggle.mutate();
  };

  return {
    likes,
    isLiked,
    toggle: runToggle,
    like: () => {
      if (!user || !postId) {
        promptAuth();
        return;
      }
      if (liking) return;
      if (!readCommunityPostLiked(qc, postId, user.id)) toggle.mutate();
    },
    isPending: liking,
  };
};

export const useCommunityCommentLike = (commentId: string | undefined, likeCount = 0) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const isLikedQ = useQuery({
    queryKey: ["community-comment-liked", commentId, user?.id],
    enabled: !!commentId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_comment_likes")
        .select("comment_id")
        .eq("comment_id", commentId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !commentId) {
        promptAuth();
        throw new Error("unauth");
      }
      if (isLikedQ.data) {
        const { error } = await supabase
          .from("community_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-comment-liked", commentId, user?.id] });
      qc.invalidateQueries({ queryKey: ["community-comments"] });
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
