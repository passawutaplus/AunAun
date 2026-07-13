import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminAudit } from "@/lib/adminAudit";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import type { ForumCategory } from "@/hooks/useForum";
import type { ForumAttachment } from "@/lib/forumAttachments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forumDb = supabase as any;

export type ForumAdminTopicRow = {
  id: string;
  title: string;
  status: string;
  moderation_state: string;
  reply_count: number;
  like_count: number;
  view_count: number;
  is_locked: boolean;
  is_pinned: boolean;
  created_at: string;
  last_activity_at: string;
  author_id: string;
  category_id: string;
  admin_note?: string;
  category?: { slug: string; name_th: string } | null;
  author_name?: string;
};

export type ForumAdminReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  target_owner_id: string | null;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_note: string;
  created_at: string;
};

export type ForumAdminOverview = {
  topicsToday: number;
  repliesToday: number;
  unanswered: number;
  openReports: number;
  hiddenTopics: number;
  blockedAttachments: number;
  topics7d: number;
  replies7d: number;
};

function startOfDayIso(daysAgo = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function useForumAdminOverview() {
  return useQuery({
    queryKey: ["admin", "forum-overview"],
    staleTime: 30_000,
    queryFn: async (): Promise<ForumAdminOverview> => {
      const today = startOfDayIso(0);
      const week = startOfDayIso(7);

      const [
        topicsToday,
        repliesToday,
        unanswered,
        openReports,
        hiddenTopics,
        blockedAttachments,
        topics7d,
        replies7d,
      ] = await Promise.all([
        forumDb
          .from("forum_topics")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today),
        forumDb
          .from("forum_replies")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today),
        forumDb
          .from("forum_topics")
          .select("id", { count: "exact", head: true })
          .eq("moderation_state", "published")
          .eq("reply_count", 0),
        supabase
          .from("user_reports" as never)
          .select("id", { count: "exact", head: true })
          .in("target_type", ["forum_topic", "forum_reply"] as never)
          .in("status", ["open", "reviewing"] as never),
        forumDb
          .from("forum_topics")
          .select("id", { count: "exact", head: true })
          .eq("moderation_state", "hidden"),
        forumDb
          .from("forum_attachments")
          .select("id", { count: "exact", head: true })
          .eq("scan_status", "blocked"),
        forumDb
          .from("forum_topics")
          .select("id", { count: "exact", head: true })
          .gte("created_at", week),
        forumDb
          .from("forum_replies")
          .select("id", { count: "exact", head: true })
          .gte("created_at", week),
      ]);

      return {
        topicsToday: topicsToday.count ?? 0,
        repliesToday: repliesToday.count ?? 0,
        unanswered: unanswered.count ?? 0,
        openReports: openReports.count ?? 0,
        hiddenTopics: hiddenTopics.count ?? 0,
        blockedAttachments: blockedAttachments.count ?? 0,
        topics7d: topics7d.count ?? 0,
        replies7d: replies7d.count ?? 0,
      };
    },
  });
}

export function useForumAdminTopics(limit = 200) {
  return useQuery({
    queryKey: ["admin", "forum-topics", limit],
    queryFn: async () => {
      const { data, error } = await forumDb
        .from("forum_topics")
        .select(
          "id, title, status, moderation_state, reply_count, like_count, view_count, is_locked, is_pinned, created_at, last_activity_at, author_id, category_id, admin_note",
        )
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as ForumAdminTopicRow[];
      if (!rows.length) return rows;

      const catIds = [...new Set(rows.map((r) => r.category_id))];
      const authorIds = [...new Set(rows.map((r) => r.author_id))];
      const [{ data: cats }, { data: profiles }] = await Promise.all([
        forumDb.from("forum_categories").select("id, slug, name_th").in("id", catIds),
        forumDb
          .from("profiles_public")
          .select("user_id, display_name, username")
          .in("user_id", authorIds),
      ]);
      const catMap = new Map(
        ((cats ?? []) as Array<{ id: string; slug: string; name_th: string }>).map((c) => [
          c.id,
          c,
        ]),
      );
      const nameMap = new Map(
        ((profiles ?? []) as Array<{ user_id: string; display_name: string }>).map((p) => [
          p.user_id,
          p.display_name,
        ]),
      );

      return rows.map((r) => ({
        ...r,
        category: catMap.get(r.category_id) ?? null,
        author_name: nameMap.get(r.author_id) ?? "สมาชิก",
      }));
    },
  });
}

export function useForumAdminReports() {
  return useQuery({
    queryKey: ["admin", "forum-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports" as never)
        .select(
          "id, reporter_id, target_type, target_id, target_owner_id, reason, details, status, admin_note, created_at",
        )
        .in("target_type", ["forum_topic", "forum_reply"] as never)
        .in("status", ["open", "reviewing"] as never)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ForumAdminReportRow[];
    },
  });
}

export function useUpdateForumReportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: "reviewing" | "resolved" | "dismissed";
      adminNote?: string;
      resolvedBy?: string;
    }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        admin_note: input.adminNote ?? "",
      };
      if (input.status === "resolved" || input.status === "dismissed") {
        patch.resolved_by = input.resolvedBy ?? null;
        patch.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("user_reports" as never)
        .update(patch as never)
        .eq("id", input.id);
      if (error) throw error;
      await logAdminAudit({
        action: `forum_report.${input.status}`,
        targetType: "user_report",
        targetId: input.id,
        metadata: { status: input.status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "forum-reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "forum-overview"] });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("อัปเดตรายงานแล้ว");
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "อัปเดตรายงานไม่สำเร็จ"));
    },
  });
}

export function useForumAdminAttachments(status: "all" | "blocked" | "pending" | "clean" = "all") {
  return useQuery({
    queryKey: ["admin", "forum-attachments", status],
    queryFn: async () => {
      let q = forumDb
        .from("forum_attachments")
        .select(
          "id, topic_id, reply_id, author_id, kind, file_name, mime_type, size_bytes, storage_path, public_url, scan_status, scan_reason, scanned_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(150);
      if (status !== "all") q = q.eq("scan_status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ForumAttachment[];
    },
  });
}

export function useAdminSetForumCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      categoryId: string;
      nameTh?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const { error } = await (supabase.rpc as any)("admin_set_forum_category" as never, {
        _category_id: input.categoryId,
        _name_th: input.nameTh ?? null,
        _description: input.description ?? null,
        _sort_order: input.sortOrder ?? null,
        _is_active: input.isActive ?? null,
      } as never);
      if (error) throw error;
      await logAdminAudit({
        action: "forum_category.update",
        targetType: "forum_category",
        targetId: input.categoryId,
        metadata: input as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum", "categories"] });
      toast.success("อัปเดตหมวดแล้ว");
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "อัปเดตหมวดไม่สำเร็จ"));
    },
  });
}

export function useForumAdminAnalytics(days = 14) {
  return useQuery({
    queryKey: ["admin", "forum-analytics", days],
    staleTime: 60_000,
    queryFn: async () => {
      const since = startOfDayIso(days);
      const [{ data: topics }, { data: replies }] = await Promise.all([
        forumDb
          .from("forum_topics")
          .select("created_at, category_id, reply_count")
          .gte("created_at", since),
        forumDb.from("forum_replies").select("created_at, author_id").gte("created_at", since),
      ]);

      const dayKey = (iso: string) => iso.slice(0, 10);
      const series: Record<string, { topics: number; replies: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const k = startOfDayIso(i).slice(0, 10);
        series[k] = { topics: 0, replies: 0 };
      }
      for (const t of topics ?? []) {
        const k = dayKey((t as { created_at: string }).created_at);
        if (series[k]) series[k].topics += 1;
      }
      for (const r of replies ?? []) {
        const k = dayKey((r as { created_at: string }).created_at);
        if (series[k]) series[k].replies += 1;
      }

      const replyCountByAuthor = new Map<string, number>();
      for (const r of replies ?? []) {
        const id = (r as { author_id: string }).author_id;
        replyCountByAuthor.set(id, (replyCountByAuthor.get(id) ?? 0) + 1);
      }
      const topHelpers = [...replyCountByAuthor.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      let profiles: Array<{ user_id: string; display_name: string; username: string | null }> = [];
      if (topHelpers.length) {
        const { data } = await forumDb
          .from("profiles_public")
          .select("user_id, display_name, username")
          .in(
            "user_id",
            topHelpers.map(([id]) => id),
          );
        profiles = (data ?? []) as typeof profiles;
      }
      const nameMap = new Map(profiles.map((p) => [p.user_id, p]));

      const { data: ranks } = await forumDb.from("forum_user_ranks").select("user_id");
      const ranked = new Set(((ranks ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));

      return {
        series: Object.entries(series).map(([date, v]) => ({ date, ...v })),
        topHelpers: topHelpers.map(([userId, count]) => ({
          userId,
          count,
          profile: nameMap.get(userId) ?? null,
          hasRank: ranked.has(userId),
        })),
        topicCount: (topics ?? []).length,
        replyCount: (replies ?? []).length,
      };
    },
  });
}

export function useForumAdminAudit(limit = 40) {
  return useQuery({
    queryKey: ["admin", "forum-audit", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log" as never)
        .select("id, action, target_type, target_id, metadata, created_at, actor_id")
        .or("action.ilike.forum%,action.ilike.forum_%,target_type.ilike.forum%")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        // Fallback: filter client-side if or syntax differs
        const { data: all, error: err2 } = await supabase
          .from("admin_audit_log" as never)
          .select("id, action, target_type, target_id, metadata, created_at, actor_id")
          .order("created_at", { ascending: false })
          .limit(200);
        if (err2) throw err2;
        return ((all ?? []) as Array<Record<string, unknown>>).filter((r) => {
          const a = String(r.action ?? "");
          const t = String(r.target_type ?? "");
          return a.includes("forum") || t.includes("forum");
        }) as Array<{
          id: string;
          action: string;
          target_type: string;
          target_id: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
          actor_id: string | null;
        }>;
      }
      return (data ?? []) as Array<{
        id: string;
        action: string;
        target_type: string;
        target_id: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
        actor_id: string | null;
      }>;
    },
  });
}

export type { ForumCategory };
