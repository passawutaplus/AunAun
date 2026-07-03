import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildCommentTree, type CommentNode } from "@/lib/commentTree";
import { notifyCommunityEvent, notifyCommunityTaggedUsers } from "@/lib/communityNotify";
import { extractCommunityLinkUrls } from "@/lib/communityLinkUrls";
import {
  isMissingOptionalCommunityColumnError,
  stripOptionalCommunityPostFields,
  toCommunityActionError,
} from "@/lib/communityRateLimit";
import {
  COMMUNITY_POST_SELECT_FULL,
  fetchCommunityPostMaybeSingle,
  fetchCommunityPostRows,
} from "@/lib/communityPostQuery";
import { moderateCommunityComment, moderateCommunityPost } from "@/lib/communityModeration";
import { normalizeCommunityMediaAspect } from "@/lib/communityMediaAspect";
import { fetchMentionedProjectSummaries } from "@/lib/communityMentionedProjects";
import type { MentionedProjectSummary } from "@/lib/communityMentionedProjects";
import { fetchTaggedUserSummaries, resolveTaggedUserIds } from "@/lib/communityTaggedUsers";
import type { TaggedUserSummary } from "@/lib/communityTaggedUsers";
import type { CommunityMediaAspect } from "@/lib/communityMediaAspect";
import { resolveComposerTitle, resolvePostCategory, resolveCommunityCategory } from "@/lib/classifyCommunityPost";
import {
  categoryDbFilterValues,
  categoryMatchesFilter,
  DEFAULT_PROJECT_CATEGORY,
  type ProjectCategory,
} from "@/data/projectTypes";
import { tagsMatchFilter } from "@/lib/communityRoutes";
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
  mentioned_project_ids: string[];
  tagged_user_ids: string[];
  media_aspect: CommunityMediaAspect;
  text_cover_theme?: string | null;
  question_topic: CommunityQuestionTopic | null;
  status: string;
  reply_count: number;
  like_count: number;
  view_count: number;
  link_urls?: string[];
  created_at: string;
  updated_at: string;
  profile?: { display_name: string; avatar_url: string | null; username: string | null } | null;
  mentioned_projects?: MentionedProjectSummary[];
  tagged_users?: TaggedUserSummary[];
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  depth: number;
  like_count: number;
  image_urls: string[];
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null; username: string | null } | null;
}

export type CommunityCommentTree = CommentNode<CommunityComment>;

const POST_SELECT = COMMUNITY_POST_SELECT_FULL;
const COMMUNITY_PAGE_SIZE = 24;
const COMMUNITY_COMMENT_LIMIT = 300;

function isRepostRow(row: { quoted_post_id?: string | null; title?: string }): boolean {
  return Boolean(row.quoted_post_id) || (row.title?.startsWith("รีโพสต์:") ?? false);
}

export async function enrichCommunityPosts(rows: CommunityPost[]): Promise<CommunityPost[]> {
  if (!rows.length) return rows;

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, username")
    .in("user_id", authorIds);

  const profileMap = new Map((profs ?? []).map((p) => [p.user_id, p]));

  return rows.map((r) => ({
    ...r,
    gallery_urls: r.gallery_urls ?? [],
    video_urls: r.video_urls ?? [],
    tags: r.tags ?? [],
    tools: r.tools ?? [],
    mentioned_project_ids: r.mentioned_project_ids ?? [],
    tagged_user_ids: r.tagged_user_ids ?? [],
    media_aspect: normalizeCommunityMediaAspect(r.media_aspect),
    text_cover_theme: r.text_cover_theme ?? null,
    like_count: r.like_count ?? 0,
    view_count: r.view_count ?? 0,
    profile: profileMap.get(r.author_id) ?? null,
  }));
}

export type CommunityPostsFilter = {
  postKind?: CommunityPostKind;
  category?: string;
  questionTopic?: CommunityQuestionTopic;
  feedSource?: "all" | "following";
  viewerId?: string;
  blockedIds?: string[];
  tag?: string;
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
        authorIds = Array.from(
          new Set([filter.viewerId, ...(follows ?? []).map((f) => f.following_id)]),
        );
      }

      const build = (select: string, excludeRepostsByColumn: boolean) => {
        let q = supabase
          .from("community_posts")
          .select(select)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .range(pageParam * COMMUNITY_PAGE_SIZE, (pageParam + 1) * COMMUNITY_PAGE_SIZE - 1);
        if (excludeRepostsByColumn) q = q.is("quoted_post_id", null);
        if (filter?.postKind) q = q.eq("post_kind", filter.postKind);
        if (filter?.category && filter.category !== "All") {
          const cats = categoryDbFilterValues(filter.category as ProjectCategory);
          q = cats.length === 1 ? q.eq("category", cats[0]!) : q.in("category", cats);
        }
        if (filter?.questionTopic) q = q.eq("question_topic", filter.questionTopic);
        if (filter?.tag?.trim()) q = q.contains("tags", [filter.tag.trim()]);
        if (authorIds) q = q.in("author_id", authorIds);
        return q;
      };

      const data = await fetchCommunityPostRows(build);
      let rows = data as CommunityPost[];
      rows = rows.filter((r) => !isRepostRow(r as { quoted_post_id?: string | null; title?: string }));
      if (filter?.tag?.trim()) {
        rows = rows.filter((r) => tagsMatchFilter(r.tags, filter.tag!));
      }
      if (filter?.category && filter.category !== "All") {
        rows = rows.filter((r) =>
          categoryMatchesFilter(r.category, filter.category as ProjectCategory),
        );
      }
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
      const data = await fetchCommunityPostRows((select, excludeRepostsByColumn) => {
        let q = supabase
          .from("community_posts")
          .select(select)
          .eq("author_id", authorId!)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(40);
        if (excludeRepostsByColumn) q = q.is("quoted_post_id", null);
        return q;
      });
      const rows = (data as CommunityPost[]).filter(
        (r) => !isRepostRow(r as { quoted_post_id?: string | null; title?: string }),
      );
      return enrichCommunityPosts(rows);
    },
  });

/** Owner manage list — published + drafts (excludes reposts). */
export const useMyCommunityPostsManage = (authorId: string | undefined) =>
  useQuery({
    queryKey: ["community-posts-manage", authorId],
    enabled: !!authorId,
    queryFn: async (): Promise<CommunityPost[]> => {
      const data = await fetchCommunityPostRows((select, excludeRepostsByColumn) => {
        let q = supabase
          .from("community_posts")
          .select(select)
          .eq("author_id", authorId!)
          .in("status", ["published", "draft"])
          .order("updated_at", { ascending: false })
          .limit(80);
        if (excludeRepostsByColumn) q = q.is("quoted_post_id", null);
        return q;
      });
      const rows = (data as CommunityPost[]).filter(
        (r) => !isRepostRow(r as { quoted_post_id?: string | null; title?: string }),
      );
      return enrichCommunityPosts(rows);
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
      const mentionedIds = row.mentioned_project_ids ?? [];
      const taggedIds = row.tagged_user_ids ?? [];
      const [mentioned_projects, tagged_users] = await Promise.all([
        mentionedIds.length > 0
          ? fetchMentionedProjectSummaries(mentionedIds, row.author_id)
          : Promise.resolve([]),
        taggedIds.length > 0 ? fetchTaggedUserSummaries(taggedIds) : Promise.resolve([]),
      ]);
      return {
        ...row,
        gallery_urls: row.gallery_urls ?? [],
        video_urls: row.video_urls ?? [],
        tags: row.tags ?? [],
        tools: row.tools ?? [],
        link_urls: row.link_urls ?? [],
        mentioned_project_ids: mentionedIds,
        tagged_user_ids: taggedIds,
        media_aspect: normalizeCommunityMediaAspect(row.media_aspect),
        text_cover_theme: row.text_cover_theme ?? null,
        like_count: row.like_count ?? 0,
        view_count: row.view_count ?? 0,
        profile: prof ?? null,
        mentioned_projects,
        tagged_users,
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
      qc.invalidateQueries({ queryKey: ["community-posts-manage"] });
    },
  });
};

export const useCommunityDraft = (authorId: string | undefined) =>
  useQuery({
    queryKey: ["community-draft", authorId],
    enabled: !!authorId,
    queryFn: async (): Promise<CommunityPost | null> => {
      const data = await fetchCommunityPostMaybeSingle((select) =>
        supabase
          .from("community_posts")
          .select(select)
          .eq("author_id", authorId!)
          .eq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      if (!data) return null;
      const row = data as CommunityPost;
      return {
        ...row,
        gallery_urls: row.gallery_urls ?? [],
        video_urls: row.video_urls ?? [],
        tags: row.tags ?? [],
        tools: row.tools ?? [],
        mentioned_project_ids: row.mentioned_project_ids ?? [],
        tagged_user_ids: row.tagged_user_ids ?? [],
        media_aspect: normalizeCommunityMediaAspect(row.media_aspect),
        text_cover_theme: row.text_cover_theme ?? null,
      };
    },
  });

export type CommunityComposerPayload = {
  author_id: string;
  title?: string;
  body: string;
  tags?: string[];
  tools?: string[];
  mentioned_project_ids?: string[];
  tagged_user_ids?: string[];
  media_aspect?: CommunityMediaAspect;
  text_cover_theme?: string | null;
  /** Explicit category; omit/null = auto-classify on publish */
  category?: ProjectCategory | null;
  gallery_urls?: string[];
  video_urls?: string[];
  draft_id?: string | null;
  edit_post_id?: string | null;
};

function resolveComposerCategory(input: CommunityComposerPayload): ProjectCategory {
  const gallery = input.gallery_urls ?? [];
  const videos = input.video_urls ?? [];
  return resolvePostCategory({
    body: input.body,
    tags: input.tags ?? [],
    tools: input.tools ?? [],
    hasVideo: videos.length > 0,
    hasImages: gallery.length > 0,
    categoryOverride: input.category ?? null,
  });
}

async function resolveMentionedProjectIds(
  authorId: string,
  ids: string[] | undefined,
): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? []));
  if (!unique.length) return [];
  const valid = await fetchMentionedProjectSummaries(unique, authorId);
  if (valid.length !== unique.length) {
    throw new Error("ผลงานที่อ้างอิงไม่ถูกต้องหรือยังไม่เผยแพร่");
  }
  return valid.map((p) => p.id);
}

async function findLatestCommunityDraftId(authorId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id")
    .eq("author_id", authorId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** True when a composer localStorage draftId still points at an open draft row. */
export async function isCommunityDraftStillOpen(
  draftId: string,
  authorId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id")
    .eq("id", draftId)
    .eq("author_id", authorId)
    .eq("status", "draft")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function updateCommunityPostRow(
  id: string,
  authorId: string,
  row: Record<string, unknown>,
): Promise<{ id: string } | null> {
  const attempt = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from("community_posts")
      .update(payload)
      .eq("id", id)
      .eq("author_id", authorId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  try {
    return await attempt(row);
  } catch (err) {
    if (isMissingOptionalCommunityColumnError(err)) {
      return await attempt(stripOptionalCommunityPostFields(row));
    }
    throw toCommunityActionError(err);
  }
}

/** Update existing draft/published row when possible; otherwise insert. */
async function upsertCommunityPostRow(
  input: CommunityComposerPayload,
  row: Record<string, unknown>,
): Promise<{ id: string }> {
  const candidateIds = [
    input.edit_post_id,
    input.draft_id,
    await findLatestCommunityDraftId(input.author_id),
  ].filter((id): id is string => Boolean(id));
  const seen = new Set<string>();
  for (const id of candidateIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const updated = await updateCommunityPostRow(id, input.author_id, row);
    if (updated) return updated;
  }

  const insertRow = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from("community_posts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return data as { id: string };
  };

  try {
    return await insertRow(row);
  } catch (err) {
    if (isMissingOptionalCommunityColumnError(err)) {
      return await insertRow(stripOptionalCommunityPostFields(row));
    }
    throw toCommunityActionError(err);
  }
}

export const useSaveCommunityDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityComposerPayload) => {
      const title = resolveComposerTitle(input.title ?? "", input.body) || "แบบร่าง";
      const mentioned_project_ids = await resolveMentionedProjectIds(
        input.author_id,
        input.mentioned_project_ids,
      );
      const tagged_user_ids = await resolveTaggedUserIds(input.author_id, input.tagged_user_ids);
      const row = {
        author_id: input.author_id,
        post_kind: "tip" as const,
        title,
        body: input.body.trim(),
        category: resolveComposerCategory(input),
        tags: input.tags ?? [],
        tools: input.tools ?? [],
        gallery_urls: input.gallery_urls ?? [],
        video_urls: input.video_urls ?? [],
        mentioned_project_ids,
        tagged_user_ids,
        media_aspect: normalizeCommunityMediaAspect(input.media_aspect),
        text_cover_theme: input.text_cover_theme ?? null,
        question_topic: null,
        status: "draft" as const,
        updated_at: new Date().toISOString(),
      };

      return upsertCommunityPostRow(input, row);
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
        try {
          const { data } = await refetchMod();
          return data ?? { allowed: true, reason: null, banned_until: null, strikes: 0 };
        } catch {
          return { allowed: true, reason: null, banned_until: null, strikes: 0 };
        }
      };

      const gallery = input.gallery_urls ?? [];
      const videos = input.video_urls ?? [];
      const category = resolveComposerCategory(input);
      const title = resolveComposerTitle(input.title ?? "", input.body);

      const moderated = await moderateCommunityPost({
        title,
        body: input.body,
        tags: input.tags ?? [],
        checkCanPost,
        recordStrike: (ctx) => recordStrike.mutateAsync(ctx),
      });
      if (!moderated) throw new Error("ไม่สามารถโพสต์ได้");

      const mentioned_project_ids = await resolveMentionedProjectIds(
        input.author_id,
        input.mentioned_project_ids,
      );
      const tagged_user_ids = await resolveTaggedUserIds(input.author_id, input.tagged_user_ids);
      const link_urls = extractCommunityLinkUrls(moderated.body);

      const row = {
        author_id: input.author_id,
        post_kind: "tip" as const,
        title: moderated.title,
        body: moderated.body,
        category,
        tags: moderated.tags,
        tools: input.tools ?? [],
        gallery_urls: gallery,
        video_urls: videos,
        mentioned_project_ids,
        tagged_user_ids,
        media_aspect: normalizeCommunityMediaAspect(input.media_aspect),
        text_cover_theme: input.text_cover_theme ?? null,
        link_urls,
        question_topic: null,
        status: "published" as const,
        updated_at: new Date().toISOString(),
      };

      const result = await upsertCommunityPostRow(input, row);

      try {
        const { data: authorProf } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", input.author_id)
          .maybeSingle();

        await notifyCommunityTaggedUsers({
          authorId: input.author_id,
          authorName: authorProf?.display_name ?? "มีคนแท็ก",
          postId: result.id,
          postTitle: moderated.title,
          taggedUserIds: tagged_user_ids,
        });
      } catch {
        /* publish succeeded — notifications are best-effort */
      }

      return result;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      qc.invalidateQueries({ queryKey: ["community-draft", v.author_id] });
      qc.invalidateQueries({ queryKey: ["community-posts-by-author", v.author_id] });
      qc.invalidateQueries({ queryKey: ["community-posts-manage", v.author_id] });
      qc.invalidateQueries({ queryKey: ["onboarding-checklist", v.author_id] });
    },
  });
};

export const useUpdateCommunityPost = () => {
  const qc = useQueryClient();
  const { refetch: refetchMod } = useModerationState();
  const recordStrike = useRecordProfanityStrike();

  return useMutation({
    mutationFn: async (input: CommunityComposerPayload & { edit_post_id: string }) => {
      const checkCanPost = async () => {
        try {
          const { data } = await refetchMod();
          return data ?? { allowed: true, reason: null, banned_until: null, strikes: 0 };
        } catch {
          return { allowed: true, reason: null, banned_until: null, strikes: 0 };
        }
      };

      const gallery = input.gallery_urls ?? [];
      const videos = input.video_urls ?? [];
      const category = resolveComposerCategory(input);
      const title = resolveComposerTitle(input.title ?? "", input.body);

      const moderated = await moderateCommunityPost({
        title,
        body: input.body,
        tags: input.tags ?? [],
        checkCanPost,
        recordStrike: (ctx) => recordStrike.mutateAsync(ctx),
      });
      if (!moderated) throw new Error("ไม่สามารถบันทึกได้");

      const mentioned_project_ids = await resolveMentionedProjectIds(
        input.author_id,
        input.mentioned_project_ids,
      );
      const tagged_user_ids = await resolveTaggedUserIds(input.author_id, input.tagged_user_ids);
      const link_urls = extractCommunityLinkUrls(moderated.body);

      const { data: prior } = await supabase
        .from("community_posts")
        .select("tagged_user_ids")
        .eq("id", input.edit_post_id)
        .maybeSingle();
      const priorTags = new Set((prior?.tagged_user_ids as string[] | undefined) ?? []);

      const row = {
        title: moderated.title,
        body: moderated.body,
        category,
        tags: moderated.tags,
        tools: input.tools ?? [],
        gallery_urls: gallery,
        video_urls: videos,
        mentioned_project_ids,
        tagged_user_ids,
        media_aspect: normalizeCommunityMediaAspect(input.media_aspect),
        text_cover_theme: input.text_cover_theme ?? null,
        link_urls,
        updated_at: new Date().toISOString(),
      };

      const updated = await updateCommunityPostRow(input.edit_post_id, input.author_id, row);
      if (!updated) throw new Error("แก้ไขโพสต์ไม่สำเร็จ");

      const newTags = tagged_user_ids.filter((id) => !priorTags.has(id));
      if (newTags.length) {
        const { data: authorProf } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", input.author_id)
          .maybeSingle();
        await notifyCommunityTaggedUsers({
          authorId: input.author_id,
          authorName: authorProf?.display_name ?? "มีคนแท็ก",
          postId: input.edit_post_id,
          postTitle: moderated.title,
          taggedUserIds: newTags,
        });
      }

      return updated;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      qc.invalidateQueries({ queryKey: ["community-post", v.edit_post_id] });
      qc.invalidateQueries({ queryKey: ["community-posts-by-author", v.author_id] });
      qc.invalidateQueries({ queryKey: ["community-posts-manage", v.author_id] });
    },
  });
};

export const useRelatedCommunityPosts = (post: CommunityPost | null | undefined, limit = 6) =>
  useQuery({
    queryKey: ["community-related", post?.id, post?.category, post?.tags],
    enabled: !!post?.id,
    queryFn: async () => {
      const tagSlice = (post!.tags ?? []).slice(0, 3);
      const data = await fetchCommunityPostRows((select, excludeRepostsByColumn) => {
        let q = supabase
          .from("community_posts")
          .select(select)
          .eq("status", "published")
          .neq("id", post!.id)
          .order("created_at", { ascending: false })
          .limit(limit * 3);
        if (excludeRepostsByColumn) q = q.is("quoted_post_id", null);
        if (post!.category) {
          const cats = categoryDbFilterValues(resolveCommunityCategory(post!.category));
          if (cats.length === 1) q = q.eq("category", cats[0]!);
          else if (cats.length > 1) q = q.in("category", cats);
        }
        return q;
      });
      const rows = (data as CommunityPost[]).filter(
        (r) => !isRepostRow(r as { quoted_post_id?: string | null; title?: string }),
      );
      const scored = rows
        .map((r) => {
          const overlap = (r.tags ?? []).filter((t) => tagSlice.includes(t)).length;
          const toolOverlap = (r.tools ?? []).filter((t) => (post!.tools ?? []).includes(t)).length;
          return { r, score: overlap * 2 + toolOverlap };
        })
        .sort((a, b) => b.score - a.score || b.r.created_at.localeCompare(a.r.created_at))
        .slice(0, limit)
        .map((x) => x.r);

      return enrichCommunityPosts(scored);
    },
  });

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
        .select("id, post_id, user_id, content, parent_id, depth, like_count, image_urls, created_at")
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
        like_count: r.like_count ?? 0,
        image_urls: r.image_urls ?? [],
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
      image_urls?: string[];
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

      const images = payload.image_urls ?? [];
      const { data: commentId, error } = await (
        supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>
      )("insert_community_comment", {
        _post_id: payload.post_id,
        _content: content,
        _parent_id: payload.parent_id ?? null,
        _depth: payload.depth ?? 0,
        _image_urls: images,
      });
      if (error) throw toCommunityActionError(error);

      const { data: postRow } = await supabase
        .from("community_posts")
        .select("author_id, title, post_kind")
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
        if (parent?.user_id && parent.user_id !== payload.user_id) {
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

      if (postRow?.author_id && postRow.author_id !== payload.user_id) {
        const isQa = postRow.post_kind === "question";
        await notifyCommunityEvent({
          recipientId: postRow.author_id,
          kind: payload.parent_id ? "community_reply" : "community_comment",
          title: payload.parent_id
            ? "มีการตอบกลับในโพสต์ของคุณ"
            : isQa
              ? "มีคนตอบคำถามของคุณ"
              : "มีความคิดเห็นใหม่",
          body: payload.parent_id
            ? `${actorName} ตอบกลับใน "${postRow.title}"`
            : `${actorName} ${isQa ? "ตอบคำถาม" : "แสดงความคิดเห็น"}ใน "${postRow.title}"`,
          link,
          metadata: { post_id: payload.post_id, comment_id: commentId },
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
