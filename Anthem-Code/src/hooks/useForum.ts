import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useAuthDialog } from "@/stores/authDialogStore";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import type { ForumSortTab, ForumTopicStatus, ForumRankSlug } from "@/lib/forum";
import { FORUM_RANK_LABELS } from "@/lib/forum";

/** Forum tables not yet in generated Database types */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forumDb = supabase as any;

export type ForumCategory = {
  id: string;
  slug: string;
  name_th: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

export type ForumProfile = {
  display_name: string;
  avatar_url: string | null;
  username: string | null;
};

export type ForumParticipant = ForumProfile & {
  user_id: string;
  is_admin?: boolean;
  rank?: ForumRankSlug | null;
  rank_title?: string | null;
};

export type ForumTopic = {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  body: string;
  status: ForumTopicStatus;
  tags: string[];
  reply_count: number;
  like_count: number;
  view_count: number;
  last_activity_at: string;
  accepted_reply_id: string | null;
  is_locked: boolean;
  is_pinned: boolean;
  pinned_at: string | null;
  moderation_state: "published" | "hidden";
  created_at: string;
  updated_at: string;
  category?: ForumCategory | null;
  profile?: ForumProfile | null;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  participants?: ForumParticipant[];
  author_rank?: ForumRankSlug | null;
  author_is_admin?: boolean;
};

export type ForumReply = {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  profile?: ForumProfile | null;
  author_rank?: ForumRankSlug | null;
  author_is_admin?: boolean;
};

export type ForumUserRank = {
  user_id: string;
  rank: ForumRankSlug;
  title_th: string;
  note: string;
  granted_by: string | null;
  updated_at: string;
  profile?: ForumProfile | null;
};

type TopicRow = Omit<
  ForumTopic,
  | "category"
  | "profile"
  | "liked_by_me"
  | "bookmarked_by_me"
  | "participants"
  | "author_rank"
  | "author_is_admin"
>;

function friendlyError(msg: string): string {
  if (msg.startsWith("RATE_LIMIT:")) return msg.replace("RATE_LIMIT:", "").trim();
  if (msg.startsWith("AUTH:")) return msg.replace("AUTH:", "").trim();
  if (msg.startsWith("INVALID:")) return msg.replace("INVALID:", "").trim();
  return msg;
}

async function loadBadgeMaps(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const rankMap = new Map<string, { rank: ForumRankSlug; title_th: string }>();
  const adminSet = new Set<string>();
  if (!ids.length) return { rankMap, adminSet };

  const [{ data: ranks }, { data: roles }] = await Promise.all([
    forumDb.from("forum_user_ranks").select("user_id, rank, title_th").in("user_id", ids),
    supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids),
  ]);

  for (const r of ranks ?? []) {
    rankMap.set((r as { user_id: string }).user_id, {
      rank: (r as { rank: ForumRankSlug }).rank,
      title_th: (r as { title_th: string }).title_th,
    });
  }
  for (const r of roles ?? []) {
    adminSet.add((r as { user_id: string }).user_id);
  }
  return { rankMap, adminSet };
}

async function attachParticipants(topics: ForumTopic[]): Promise<ForumTopic[]> {
  if (!topics.length) return topics;
  const topicIds = topics.map((t) => t.id);
  const { data: replyRows } = await forumDb
    .from("forum_replies")
    .select("topic_id, author_id, created_at")
    .in("topic_id", topicIds)
    .order("created_at", { ascending: false });

  const byTopic = new Map<string, string[]>();
  for (const row of replyRows ?? []) {
    const tid = (row as { topic_id: string }).topic_id;
    const aid = (row as { author_id: string }).author_id;
    const list = byTopic.get(tid) ?? [];
    if (!list.includes(aid)) list.push(aid);
    byTopic.set(tid, list);
  }

  // Include authors first in participant set
  const allUserIds = new Set<string>();
  for (const t of topics) {
    allUserIds.add(t.author_id);
    for (const id of (byTopic.get(t.id) ?? []).slice(0, 5)) allUserIds.add(id);
  }

  const ids = Array.from(allUserIds);
  const [{ data: profiles }, { rankMap, adminSet }] = await Promise.all([
    forumDb
      .from("profiles_public")
      .select("user_id, display_name, avatar_url, username")
      .in("user_id", ids),
    loadBadgeMaps(ids),
  ]);

  const profileMap = new Map(
    ((profiles ?? []) as Array<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      username: string | null;
    }>).map((p) => [p.user_id, p]),
  );

  return topics.map((t) => {
    const replyAuthors = byTopic.get(t.id) ?? [];
    const ordered = [t.author_id, ...replyAuthors.filter((id) => id !== t.author_id)].slice(0, 5);
    const participants: ForumParticipant[] = ordered
      .map((uid) => {
        const p = profileMap.get(uid);
        if (!p) return null;
        const rank = rankMap.get(uid);
        return {
          user_id: uid,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          username: p.username,
          is_admin: adminSet.has(uid),
          rank: rank?.rank ?? null,
          rank_title: rank?.title_th ?? null,
        } satisfies ForumParticipant;
      })
      .filter(Boolean) as ForumParticipant[];

    const authorRank = rankMap.get(t.author_id);
    return {
      ...t,
      participants,
      author_rank: authorRank?.rank ?? null,
      author_is_admin: adminSet.has(t.author_id),
    };
  });
}

async function attachProfiles<T extends { author_id: string }>(
  rows: T[],
): Promise<(T & { profile: ForumProfile | null })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.author_id)));
  if (!ids.length) return rows.map((r) => ({ ...r, profile: null }));
  const { data } = await forumDb
    .from("profiles_public")
    .select("user_id, display_name, avatar_url, username")
    .in("user_id", ids) as { data: Array<{ user_id: string; display_name: string; avatar_url: string | null; username: string | null }> | null };
  const map = new Map(
    (data ?? []).map((p) => [
      (p as { user_id: string }).user_id,
      {
        display_name: (p as { display_name: string }).display_name,
        avatar_url: (p as { avatar_url: string | null }).avatar_url,
        username: (p as { username: string | null }).username,
      } satisfies ForumProfile,
    ]),
  );
  return rows.map((r) => ({ ...r, profile: map.get(r.author_id) ?? null }));
}

async function attachCategories(rows: TopicRow[]): Promise<ForumTopic[]> {
  const catIds = Array.from(new Set(rows.map((r) => r.category_id)));
  const { data: cats } = await forumDb
    .from("forum_categories")
    .select("id, slug, name_th, description, icon, sort_order, is_active")
    .in("id", catIds);
  const catMap = new Map<string, ForumCategory>(
    ((cats ?? []) as ForumCategory[]).map((c) => [c.id, c]),
  );
  const withProfiles = await attachProfiles(rows);
  return withProfiles.map((r) => ({
    ...r,
    tags: (r.tags ?? []) as string[],
    category: catMap.get(r.category_id) ?? null,
  }));
}

export function useForumCategories(opts?: { includeInactive?: boolean }) {
  const includeInactive = !!opts?.includeInactive;
  return useQuery({
    queryKey: ["forum", "categories", includeInactive ? "all" : "active"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = forumDb
        .from("forum_categories")
        .select("id, slug, name_th, description, icon, sort_order, is_active")
        .order("sort_order", { ascending: true });
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ForumCategory[];
    },
  });
}

export function useForumTopics(opts: {
  categorySlug?: string;
  sort?: ForumSortTab;
  limit?: number;
}) {
  const { categorySlug, sort = "latest", limit = 40 } = opts;
  const { user } = useAuth();

  return useQuery({
    queryKey: ["forum", "topics", categorySlug ?? "all", sort, limit, user?.id ?? "guest"],
    queryFn: async () => {
      let categoryId: string | undefined;
      if (categorySlug) {
        const { data: cat, error: catErr } = await forumDb
          .from("forum_categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (catErr) throw catErr;
        if (!cat) return [] as ForumTopic[];
        categoryId = (cat as { id: string }).id;
      }

      let q = forumDb
        .from("forum_topics")
        .select(
          "id, category_id, author_id, title, body, status, tags, reply_count, like_count, view_count, last_activity_at, accepted_reply_id, is_locked, is_pinned, pinned_at, moderation_state, created_at, updated_at",
        )
        .eq("moderation_state", "published");

      if (categoryId) q = q.eq("category_id", categoryId);

      // Pinned topics always float to the top for every user
      q = q.order("is_pinned", { ascending: false }).order("pinned_at", { ascending: false, nullsFirst: false });

      if (sort === "popular") {
        q = q.order("like_count", { ascending: false }).order("reply_count", { ascending: false });
      } else if (sort === "unanswered") {
        q = q.eq("reply_count", 0).order("created_at", { ascending: false });
      } else {
        q = q.order("last_activity_at", { ascending: false });
      }

      const { data, error } = await q.limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as TopicRow[];
      const base = await attachCategories(rows);
      const topics = await attachParticipants(base);

      if (!user?.id || !topics.length) return topics;

      const ids = topics.map((t) => t.id);
      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        forumDb.from("forum_topic_likes").select("topic_id").eq("user_id", user.id).in("topic_id", ids),
        forumDb
          .from("forum_topic_bookmarks")
          .select("topic_id")
          .eq("user_id", user.id)
          .in("topic_id", ids),
      ]);
      const liked = new Set((likes ?? []).map((l) => (l as { topic_id: string }).topic_id));
      const booked = new Set((bookmarks ?? []).map((b) => (b as { topic_id: string }).topic_id));
      return topics.map((t) => ({
        ...t,
        liked_by_me: liked.has(t.id),
        bookmarked_by_me: booked.has(t.id),
      }));
    },
  });
}

export function useForumTopic(topicId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["forum", "topic", topicId, user?.id ?? "guest"],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await forumDb
        .from("forum_topics")
        .select(
          "id, category_id, author_id, title, body, status, tags, reply_count, like_count, view_count, last_activity_at, accepted_reply_id, is_locked, is_pinned, pinned_at, moderation_state, created_at, updated_at",
        )
        .eq("id", topicId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [base] = await attachCategories([data as TopicRow]);
      const [topic] = await attachParticipants([base]);
      if (!user?.id) return topic;
      const [{ data: like }, { data: bookmark }] = await Promise.all([
        forumDb
          .from("forum_topic_likes")
          .select("topic_id")
          .eq("user_id", user.id)
          .eq("topic_id", topicId!)
          .maybeSingle(),
        forumDb
          .from("forum_topic_bookmarks")
          .select("topic_id")
          .eq("user_id", user.id)
          .eq("topic_id", topicId!)
          .maybeSingle(),
      ]);
      return {
        ...topic,
        liked_by_me: !!like,
        bookmarked_by_me: !!bookmark,
      };
    },
  });
}

export function useForumReplies(topicId: string | undefined) {
  return useQuery({
    queryKey: ["forum", "replies", topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await forumDb
        .from("forum_replies")
        .select("id, topic_id, author_id, body, parent_id, is_accepted, created_at, updated_at")
        .eq("topic_id", topicId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const withProfiles = await attachProfiles((data ?? []) as ForumReply[]);
      const { rankMap, adminSet } = await loadBadgeMaps(withProfiles.map((r) => r.author_id));
      return withProfiles.map((r) => ({
        ...r,
        author_rank: rankMap.get(r.author_id)?.rank ?? null,
        author_is_admin: adminSet.has(r.author_id),
      }));
    },
  });
}

export function useForumTopicAttachments(topicId: string | undefined) {
  return useQuery({
    queryKey: ["forum", "attachments", "topic", topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { fetchForumAttachments } = await import("@/lib/forumAttachments");
      return fetchForumAttachments({ topicId });
    },
  });
}

export function useForumReplyAttachments(replyIds: string[]) {
  const key = replyIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["forum", "attachments", "replies", key],
    enabled: replyIds.length > 0,
    queryFn: async () => {
      const { fetchForumAttachments } = await import("@/lib/forumAttachments");
      const rows = await fetchForumAttachments({ replyIds });
      const map = new Map<string, typeof rows>();
      for (const row of rows) {
        if (!row.reply_id) continue;
        const list = map.get(row.reply_id) ?? [];
        list.push(row);
        map.set(row.reply_id, list);
      }
      return map;
    },
  });
}

export function useForumSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ["forum", "search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const pattern = `%${term}%`;
      const { data, error } = await forumDb
        .from("forum_topics")
        .select(
          "id, category_id, author_id, title, body, status, tags, reply_count, like_count, view_count, last_activity_at, accepted_reply_id, is_locked, is_pinned, pinned_at, moderation_state, created_at, updated_at",
        )
        .eq("moderation_state", "published")
        .or(`title.ilike.${pattern},body.ilike.${pattern}`)
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const base = await attachCategories((data ?? []) as TopicRow[]);
      return attachParticipants(base);
    },
  });
}

export function useTrendingForumTopics(limit = 5) {
  return useQuery({
    queryKey: ["forum", "trending", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await forumDb
        .from("forum_topics")
        .select("id, title, reply_count, like_count, last_activity_at")
        .eq("moderation_state", "published")
        .gte("last_activity_at", since)
        .order("reply_count", { ascending: false })
        .order("like_count", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Pick<ForumTopic, "id" | "title" | "reply_count" | "like_count" | "last_activity_at">[];
    },
  });
}

export function useCreateForumTopic() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const openSignup = useAuthDialog((s) => s.openSignup);

  return useMutation({
    mutationFn: async (input: {
      categorySlug: string;
      title: string;
      body: string;
      tags?: string[];
      attachmentIds?: string[];
    }) => {
      if (!user) {
        openSignup("/forum/new");
        throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      }
      const { data, error } = await (supabase.rpc as any)("create_forum_topic" as never, {
        _category_slug: input.categorySlug,
        _title: input.title,
        _body: input.body,
        _tags: input.tags ?? [],
      } as never);
      if (error) throw error;
      const id = data as string;
      if (input.attachmentIds?.length) {
        const { linkForumAttachments } = await import("@/lib/forumAttachments");
        await linkForumAttachments({ attachmentIds: input.attachmentIds, topicId: id });
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum"] });
      toast.success("สร้างกระทู้แล้ว");
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "สร้างกระทู้ไม่สำเร็จ";
      toast.error(mapWriteFlowError(err, friendlyError(raw)));
    },
  });
}

export function useCreateForumReply() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const openSignup = useAuthDialog((s) => s.openSignup);

  return useMutation({
    mutationFn: async (input: {
      topicId: string;
      body: string;
      parentId?: string | null;
      attachmentIds?: string[];
    }) => {
      if (!user) {
        openSignup();
        throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      }
      const { data, error } = await (supabase.rpc as any)("create_forum_reply" as never, {
        _topic_id: input.topicId,
        _body: input.body,
        _parent_id: input.parentId ?? null,
      } as never);
      if (error) throw error;
      const id = data as string;
      if (input.attachmentIds?.length) {
        const { linkForumAttachments } = await import("@/lib/forumAttachments");
        await linkForumAttachments({ attachmentIds: input.attachmentIds, replyId: id });
      }
      return id;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["forum", "replies", vars.topicId] });
      qc.invalidateQueries({ queryKey: ["forum", "topic", vars.topicId] });
      qc.invalidateQueries({ queryKey: ["forum", "topics"] });
      qc.invalidateQueries({ queryKey: ["forum", "attachments"] });
      toast.success("ส่งคำตอบแล้ว");
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "ตอบไม่สำเร็จ";
      toast.error(mapWriteFlowError(err, friendlyError(raw)));
    },
  });
}

export function useToggleForumLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const openSignup = useAuthDialog((s) => s.openSignup);

  return useMutation({
    mutationFn: async (input: { topicId: string; liked: boolean }) => {
      if (!user) {
        openSignup();
        throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      }
      if (input.liked) {
        const { error } = await forumDb
          .from("forum_topic_likes")
          .delete()
          .eq("topic_id", input.topicId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await forumDb
          .from("forum_topic_likes")
          .insert({ topic_id: input.topicId, user_id: user.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["forum"] });
      toast.success(vars.liked ? "ยกเลิกถูกใจแล้ว" : "ถูกใจแล้ว");
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "อัปเดตถูกใจไม่สำเร็จ"));
    },
  });
}

export function useToggleForumBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const openSignup = useAuthDialog((s) => s.openSignup);

  return useMutation({
    mutationFn: async (input: { topicId: string; bookmarked: boolean }) => {
      if (!user) {
        openSignup();
        throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      }
      if (input.bookmarked) {
        const { error } = await forumDb
          .from("forum_topic_bookmarks")
          .delete()
          .eq("topic_id", input.topicId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await forumDb
          .from("forum_topic_bookmarks")
          .insert({ topic_id: input.topicId, user_id: user.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["forum"] });
      toast.success(vars.bookmarked ? "เลิกบันทึกแล้ว" : "บันทึกแล้ว");
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "อัปเดตบันทึกไม่สำเร็จ"));
    },
  });
}

export function useAcceptForumReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await (supabase.rpc as any)("accept_forum_reply" as never, {
        _reply_id: replyId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum"] });
      toast.success("เลือกเป็นคำตอบแล้ว");
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "เลือกคำตอบไม่สำเร็จ";
      toast.error(mapWriteFlowError(err, friendlyError(raw)));
    },
  });
}

export function useBumpForumView(topicId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      if (!topicId) return;
      await (supabase.rpc as any)("bump_forum_topic_view" as never, { _topic_id: topicId } as never);
    },
  });
}

export function useAdminSetForumTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      topicId: string;
      moderationState?: "published" | "hidden" | null;
      status?: ForumTopicStatus | null;
      isLocked?: boolean | null;
      isPinned?: boolean | null;
      adminNote?: string | null;
    }) => {
      const { error } = await (supabase.rpc as any)("admin_set_forum_topic" as never, {
        _topic_id: input.topicId,
        _moderation_state: input.moderationState ?? null,
        _status: input.status ?? null,
        _is_locked: input.isLocked ?? null,
        _is_pinned: input.isPinned ?? null,
        _admin_note: input.adminNote ?? null,
      } as never);
      if (error) throw error;
      const { logAdminAudit } = await import("@/lib/adminAudit");
      await logAdminAudit({
        action: "forum_topic.update",
        targetType: "forum_topic",
        targetId: input.topicId,
        metadata: {
          moderationState: input.moderationState,
          status: input.status,
          isLocked: input.isLocked,
          isPinned: input.isPinned,
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["forum"] });
      qc.invalidateQueries({ queryKey: ["admin", "forum"] });
      qc.invalidateQueries({ queryKey: ["admin", "forum-topics"] });
      qc.invalidateQueries({ queryKey: ["admin", "forum-overview"] });
      toast.success(
        vars.isPinned === true
          ? "ปักหมุดกระทู้แล้ว — ทุกคนจะเห็นด้านบน"
          : vars.isPinned === false
            ? "ถอนหมุดแล้ว"
            : "อัปเดตกระทู้แล้ว",
      );
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "อัปเดตไม่สำเร็จ"));
    },
  });
}

export function useForumRanks() {
  return useQuery({
    queryKey: ["forum", "ranks"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await forumDb
        .from("forum_user_ranks")
        .select("user_id, rank, title_th, note, granted_by, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Omit<ForumUserRank, "profile">[];
      if (!rows.length) return [] as ForumUserRank[];
      const ids = rows.map((r) => r.user_id);
      const { data: profiles } = await forumDb
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      const map = new Map(
        ((profiles ?? []) as Array<{
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          username: string | null;
        }>).map((p) => [
          p.user_id,
          {
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            username: p.username,
          } satisfies ForumProfile,
        ]),
      );
      return rows.map((r) => ({
        ...r,
        profile: map.get(r.user_id) ?? null,
      }));
    },
  });
}

export function useAdminSetForumRank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      rank: ForumRankSlug | "none";
      note?: string;
    }) => {
      const { error } = await (supabase.rpc as any)("admin_set_forum_rank" as never, {
        _user_id: input.userId,
        _rank: input.rank === "none" ? null : input.rank,
        _note: input.note ?? "",
      } as never);
      if (error) throw error;
      const { logAdminAudit } = await import("@/lib/adminAudit");
      await logAdminAudit({
        action: input.rank === "none" ? "forum_rank.revoke" : "forum_rank.set",
        targetType: "forum_user_rank",
        targetId: input.userId,
        metadata: { rank: input.rank, note: input.note },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["forum"] });
      qc.invalidateQueries({ queryKey: ["admin", "forum-audit"] });
      qc.invalidateQueries({ queryKey: ["admin", "forum-analytics"] });
      toast.success(
        vars.rank === "none"
          ? "ถอนยศแล้ว"
          : `ตั้งยศเป็น${FORUM_RANK_LABELS[vars.rank]}แล้ว`,
      );
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "ตั้งยศไม่สำเร็จ"));
    },
  });
}

/** Search public profiles by username / display name (admin helper). */
export function useForumProfileSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ["forum", "profile-search", term],
    enabled: term.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const pattern = `%${term.replace(/[%_,]/g, "")}%`;
      const { data, error } = await forumDb
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .or(`username.ilike."${pattern}",display_name.ilike."${pattern}"`)
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Array<{
        user_id: string;
        display_name: string;
        avatar_url: string | null;
        username: string | null;
      }>;
    },
  });
}
