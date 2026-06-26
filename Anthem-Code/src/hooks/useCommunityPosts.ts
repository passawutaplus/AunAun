import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildCommentTree, type CommentNode } from "@/lib/commentTree";
import { notifyCommunityEvent } from "@/lib/communityNotify";
import { moderateCommunityComment, moderateCommunityPost } from "@/lib/communityModeration";
import { classifyCategory, deriveTitle, resolveComposerTitle } from "@/lib/classifyCommunityPost";
import {
  useModerationState,
  useRecordProfanityStrike,
} from "@/hooks/useModeration";

export type CommunityPostKind = "tip" | "question";

export type CommunityQuestionTopic =
  | "feedback"
  | "technique"
  | "tools"
  | "career"
  | "client"
  | "inspiration"
  | "other";

export interface CommunityPost {
  id: string;
  author_id: string;
  post_kind: CommunityPostKind;
  title: string;
  body: string;
  category: string;
  tags: string[];
  tools: string[];
  gallery_urls: string[];
  video_urls: string[];
  question_topic: CommunityQuestionTopic | null;
  status: string;
  reply_count: number;
  like_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  profile?: { display_name: string; avatar_url: string | null; username: string | null } | null;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  depth: number;
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null; username: string | null } | null;
}

export type CommunityCommentTree = CommentNode<CommunityComment>;

const POST_SELECT =
  "id, author_id, post_kind, title, body, category, tags, tools, gallery_urls, video_urls, question_topic, status, reply_count, like_count, view_count, created_at, updated_at";
const COMMUNITY_PAGE_SIZE = 24;
const COMMUNITY_COMMENT_LIMIT = 300;

export async function enrichCommunityPosts(rows: CommunityPost[]): Promise<CommunityPost[]> {
  const ids = Array.from(new Set(rows.map((r) => r.author_id)));
  if (!ids.length) return rows;
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, username")
    .in("user_id", ids);
  const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
  return rows.map((r) => ({
    ...r,
    gallery_urls: r.gallery_urls ?? [],
    video_urls: r.video_urls ?? [],
    tags: r.tags ?? [],
    tools: r.tools ?? [],
    like_count: r.like_count ?? 0,
    view_count: r.view_count ?? 0,
    profile: map.get(r.author_id) ?? null,
  }));
}

export type CommunityPostsFilter = {
  postKind?: CommunityPostKind;
  category?: string;
  questionTopic?: CommunityQuestionTopic;
  feedSource?: "all" | "following";
  viewerId?: string;
  blockedIds?: string[];
};

export const useCommunityPosts = (filter?: CommunityPostsFilter) => {
  const query = useInfiniteQuery({
    queryKey: ["community-posts", filter ?? "all"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ items: CommunityPost[]; rawCount: number }> => {
      let authorIds: string[] | null = null;
      if (filter?.feedSource === "following" && filter.viewerId) {
        const { data: follows, error: fErr } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", filter.viewerId);
        if (fErr) throw fErr;
        authorIds = (follows ?? []).map((f) => f.following_id);
        if (!authorIds.length) return { items: [], rawCount: 0 };
      }

      let q = supabase
        .from("community_posts")
        .select(POST_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(pageParam * COMMUNITY_PAGE_SIZE, (pageParam + 1) * COMMUNITY_PAGE_SIZE - 1);
      if (filter?.postKind) q = q.eq("post_kind", filter.postKind);
      if (filter?.category && filter.category !== "All") q = q.eq("category", filter.category);
      if (filter?.questionTopic) q = q.eq("question_topic", filter.questionTopic);
      if (authorIds) q = q.in("author_id", authorIds);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as CommunityPost[];
      const rawCount = rows.length;
      const blocked = new Set(filter?.blockedIds ?? []);
      if (blocked.size) rows = rows.filter((r) => !blocked.has(r.author_id));
      return { items: await enrichCommunityPosts(rows), rawCount };
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.rawCount === COMMUNITY_PAGE_SIZE ? pages.length : undefined,
  });
  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.items) ?? [],
  };
};

export const useCommunityPostsByAuthor = (authorId: string | undefined) =>
  useQuery({
    queryKey: ["community-posts-by-author", authorId],
    enabled: !!authorId,
    queryFn: async (): Promise<CommunityPost[]> => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(POST_SELECT)
        .eq("author_id", authorId!)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return enrichCommunityPosts((data ?? []) as CommunityPost[]);
    },
  });

export const useCommunityPost = (id: string | undefined) =>
  useQuery({
    queryKey: ["community-post", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as CommunityPost;
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .eq("user_id", row.author_id)
        .maybeSingle();
      return {
        ...row,
        gallery_urls: row.gallery_urls ?? [],
        video_urls: row.video_urls ?? [],
        tags: row.tags ?? [],
        tools: row.tools ?? [],
        like_count: row.like_count ?? 0,
        view_count: row.view_count ?? 0,
        profile: prof ?? null,
      };
    },
  });

export const useDeleteCommunityPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: (_d, postId) => {
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      qc.invalidateQueries({ queryKey: ["community-post", postId] });
      qc.invalidateQueries({ queryKey: ["community-posts-by-author"] });
    },
  });
};

export const useCommunityDraft = (authorId: string | undefined) =>
  useQuery({
    queryKey: ["community-draft", authorId],
    enabled: !!authorId,
    queryFn: async (): Promise<CommunityPost | null> => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(POST_SELECT)
        .eq("author_id", authorId!)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as CommunityPost;
      return {
        ...row,
        gallery_urls: row.gallery_urls ?? [],
        video_urls: row.video_urls ?? [],
        tags: row.tags ?? [],
        tools: row.tools ?? [],
      };
    },
  });

export type CommunityComposerPayload = {
  author_id: string;
  title?: string;
  body: string;
  tags?: string[];
  tools?: string[];
  gallery_urls?: string[];
  video_urls?: string[];
  draft_id?: string | null;
};

export const useSaveCommunityDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityComposerPayload) => {
      const title = resolveComposerTitle(input.title ?? "", input.body) || "แบบร่าง";
      const row = {
        author_id: input.author_id,
        post_kind: "tip" as const,
        title,
        body: input.body.trim(),
        category: "Graphic",
        tags: input.tags ?? [],
        tools: input.tools ?? [],
        gallery_urls: input.gallery_urls ?? [],
        video_urls: input.video_urls ?? [],
        question_topic: null,
        status: "draft" as const,
        updated_at: new Date().toISOString(),
      };

      if (input.draft_id) {
        const { data, error } = await supabase
          .from("community_posts")
          .update(row)
          .eq("id", input.draft_id)
          .eq("author_id", input.author_id)
          .select("id")
          .single();
        if (error) throw error;
        return data as { id: string };
      }

      const { data: existing } = await supabase
        .from("community_posts")
        .select("id")
        .eq("author_id", input.author_id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("community_posts")
          .update(row)
          .eq("id", existing.id)
          .eq("author_id", input.author_id)
          .select("id")
          .single();
        if (error) throw error;
        return data as { id: string };
      }

      const { data, error } = await supabase
        .from("community_posts")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["community-draft", v.author_id] });
    },
  });
};

export const usePublishCommunityPost = () => {
  const qc = useQueryClient();
  const { refetch: refetchMod } = useModerationState();
  const recordStrike = useRecordProfanityStrike();

  return useMutation({
    mutationFn: async (input: CommunityComposerPayload) => {
      const checkCanPost = async () => {
        const { data } = await refetchMod();
        return data ?? { allowed: true, reason: null, banned_until: null, strikes: 0 };
      };

      const gallery = input.gallery_urls ?? [];
      const videos = input.video_urls ?? [];
      const category = classifyCategory({
        body: input.body,
        tags: input.tags ?? [],
        tools: input.tools ?? [],
        hasVideo: videos.length > 0,
        hasImages: gallery.length > 0,
      });
      const title = resolveComposerTitle(input.title ?? "", input.body);

      const moderated = await moderateCommunityPost({
        title,
        body: input.body,
        tags: input.tags ?? [],
        checkCanPost,
        recordStrike: (ctx) => recordStrike.mutateAsync(ctx),
      });
      if (!moderated) throw new Error("ไม่สามารถโพสต์ได้");

      const row = {
        post_kind: "tip" as const,
        title: moderated.title,
        body: moderated.body,
        category,
        tags: moderated.tags,
        tools: input.tools ?? [],
        gallery_urls: gallery,
        video_urls: videos,
        question_topic: null,
        status: "published" as const,
        updated_at: new Date().toISOString(),
      };

      if (input.draft_id) {
        const { data, error } = await supabase
          .from("community_posts")
          .update(row)
          .eq("id", input.draft_id)
          .eq("author_id", input.author_id)
          .select("id")
          .single();
        if (error) throw error;
        return data as { id: string };
      }

      const { data, error } = await supabase
        .from("community_posts")
        .insert({ author_id: input.author_id, ...row })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      qc.invalidateQueries({ queryKey: ["community-draft", v.author_id] });
    },
  });
};

/** @deprecated Use usePublishCommunityPost */
export const useCreateCommunityPost = usePublishCommunityPost;

export const useCommunityComments = (postId: string | undefined) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["community-comments", postId],
    enabled: !!postId,
    queryFn: async (): Promise<CommunityCommentTree[]> => {
      const { data, error } = await supabase
        .from("community_post_comments")
        .select("id, post_id, user_id, content, parent_id, depth, created_at")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true })
        .limit(COMMUNITY_COMMENT_LIMIT);
      if (error) throw error;
      const rows = (data ?? []) as CommunityComment[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
      const enriched = rows.map((r) => ({
        ...r,
        parent_id: r.parent_id ?? null,
        profile: map.get(r.user_id) ?? null,
      }));
      return buildCommentTree(enriched);
    },
  });

  useEffect(() => {
    if (!postId) return;
    const ch = supabase
      .channel(`community-comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "community_post_comments", filter: `post_id=eq.${postId}` },
        () => qc.invalidateQueries({ queryKey: ["community-comments", postId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [postId, qc]);

  return query;
};

export const useCreateCommunityComment = () => {
  const qc = useQueryClient();
  const { refetch: refetchMod } = useModerationState();
  const recordStrike = useRecordProfanityStrike();

  return useMutation({
    mutationFn: async (payload: {
      post_id: string;
      user_id: string;
      content: string;
      parent_id?: string | null;
      depth?: number;
    }) => {
      const checkCanPost = async () => {
        const { data } = await refetchMod();
        return data ?? { allowed: true, reason: null, banned_until: null, strikes: 0 };
      };

      const content = await moderateCommunityComment(
        payload.content,
        !!payload.parent_id,
        checkCanPost,
        (ctx) => recordStrike.mutateAsync(ctx),
      );
      if (!content) throw new Error("ไม่สามารถส่งคอมเมนต์ได้");

      const { error } = await supabase.from("community_post_comments").insert({
        post_id: payload.post_id,
        user_id: payload.user_id,
        content,
        parent_id: payload.parent_id ?? null,
        depth: payload.depth ?? 0,
      });
      if (error) throw error;

      const { data: postRow } = await supabase
        .from("community_posts")
        .select("author_id, title")
        .eq("id", payload.post_id)
        .maybeSingle();
      const link = `/community/${payload.post_id}#comments`;
      const actorName =
        (
          await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", payload.user_id)
            .maybeSingle()
        ).data?.display_name ?? "มีคนตอบ";

      if (payload.parent_id) {
        const { data: parent } = await supabase
          .from("community_post_comments")
          .select("user_id")
          .eq("id", payload.parent_id)
          .maybeSingle();
        if (parent?.user_id) {
          await notifyCommunityEvent({
            recipientId: parent.user_id,
            kind: "community_reply",
            title: "มีการตอบกลับความคิดเห็น",
            body: `${actorName} ตอบกลับความคิดเห็นของคุณ`,
            link,
            metadata: { post_id: payload.post_id, comment_id: payload.parent_id },
          });
        }
      }

      if (postRow?.author_id) {
        await notifyCommunityEvent({
          recipientId: postRow.author_id,
          kind: payload.parent_id ? "community_reply" : "community_comment",
          title: payload.parent_id ? "มีการตอบกลับในโพสต์ของคุณ" : "มีความคิดเห็นใหม่",
          body: payload.parent_id
            ? `${actorName} ตอบกลับใน "${postRow.title}"`
            : `${actorName} แสดงความคิดเห็นใน "${postRow.title}"`,
          link,
          metadata: { post_id: payload.post_id },
        });
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["community-comments", v.post_id] });
      qc.invalidateQueries({ queryKey: ["community-post", v.post_id] });
      qc.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
};
