import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  totalUsers: number;
  newUsers24h: number;
  totalStudios: number;
  publishedProjects: number;
  openJobs: number;
  pendingHiring: number;
  pendingCollabs: number;
  messages24h: number;
  totalCollections: number;
  likes24h: number;
  comments24h: number;
  follows24h: number;
  gifts24h: number;
  views24h: number;
  openReports: number;
  pendingCashouts: number;
  openFeedback: number;
  pendingKyc: number;
  openAmlFlags: number;
}

const since = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [
        users, newUsers, studios, projects, jobs, hiring, collabs, msgs, cols,
        likes, comments, follows, gifts, views, reports, cashouts, feedback, kyc, aml,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase.from("studios").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "Published"),
        supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("hiring_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่"),
        supabase.from("collab_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่"),
        supabase.from("messages").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase.from("collections").select("*", { count: "exact", head: true }),
        supabase.from("project_likes").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase.from("project_comments").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase.from("follows").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase.from("gift_transactions").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase.from("project_views").select("*", { count: "exact", head: true }).gte("viewed_at", since(24)),
        supabase.from("user_reports" as never).select("*", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
        supabase.from("cashout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("app_feedback" as never).select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("aml_flags").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        totalUsers: users.count ?? 0,
        newUsers24h: newUsers.count ?? 0,
        totalStudios: studios.count ?? 0,
        publishedProjects: projects.count ?? 0,
        openJobs: jobs.count ?? 0,
        pendingHiring: hiring.count ?? 0,
        pendingCollabs: collabs.count ?? 0,
        messages24h: msgs.count ?? 0,
        totalCollections: cols.count ?? 0,
        likes24h: likes.count ?? 0,
        comments24h: comments.count ?? 0,
        follows24h: follows.count ?? 0,
        gifts24h: gifts.count ?? 0,
        views24h: views.count ?? 0,
        openReports: reports.count ?? 0,
        pendingCashouts: cashouts.count ?? 0,
        openFeedback: feedback.count ?? 0,
        pendingKyc: kyc.count ?? 0,
        openAmlFlags: aml.count ?? 0,
      };
    },
  });
}

export interface TimelinePoint { date: string; users: number; projects: number; jobs: number }

export function useAdminTimeline(days = 14) {
  return useQuery<TimelinePoint[]>({
    queryKey: ["admin-timeline", days],
    queryFn: async () => {
      const start = new Date(Date.now() - days * 86_400_000).toISOString();
      const [u, p, j] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", start),
        supabase.from("projects").select("created_at").gte("created_at", start),
        supabase.from("job_posts").select("created_at").gte("created_at", start),
      ]);
      const out: TimelinePoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        out.push({
          date: d.slice(5),
          users: (u.data ?? []).filter((r) => r.created_at.slice(0, 10) === d).length,
          projects: (p.data ?? []).filter((r) => r.created_at.slice(0, 10) === d).length,
          jobs: (j.data ?? []).filter((r) => r.created_at.slice(0, 10) === d).length,
        });
      }
      return out;
    },
  });
}

export type ActivityEventType =
  | "user" | "project" | "job" | "hire" | "collab" | "studio"
  | "like" | "comment" | "follow" | "gift" | "view" | "report"
  | "feedback" | "collection" | "inspire" | "message" | "cashout"
  | "kyc" | "aml" | "admin";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle: string;
  at: string;
  actorId?: string;
  targetId?: string;
  link?: string;
}

export function useLiveActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  // initial fetch
  useEffect(() => {
    (async () => {
      const [p, j, h, c, s, u] = await Promise.all([
        supabase.from("projects").select("id,title,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("job_posts").select("id,title,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("hiring_requests").select("id,project_title,client_name,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("collab_requests").select("id,message,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("studios").select("id,name,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("user_id,display_name,created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      const evs: ActivityEvent[] = [
        ...(p.data ?? []).map((r): ActivityEvent => ({ id: `p-${r.id}`, type: "project", title: "ผลงานใหม่", subtitle: r.title, at: r.created_at })),
        ...(j.data ?? []).map((r): ActivityEvent => ({ id: `j-${r.id}`, type: "job", title: "ประกาศงานใหม่", subtitle: r.title, at: r.created_at })),
        ...(h.data ?? []).map((r): ActivityEvent => ({ id: `h-${r.id}`, type: "hire", title: "คำขอจ้างงาน", subtitle: `${r.client_name} → ${r.project_title}`, at: r.created_at })),
        ...(c.data ?? []).map((r): ActivityEvent => ({ id: `c-${r.id}`, type: "collab", title: "คำขอคอลแลป", subtitle: r.message?.slice(0, 60) ?? "", at: r.created_at })),
        ...(s.data ?? []).map((r): ActivityEvent => ({ id: `s-${r.id}`, type: "studio", title: "สตูดิโอใหม่", subtitle: r.name, at: r.created_at })),
        ...(u.data ?? []).map((r): ActivityEvent => ({ id: `u-${r.id}`, type: "user", title: "สมาชิกใหม่", subtitle: r.display_name || "ไม่ระบุชื่อ", at: r.created_at })),
      ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
      setEvents(evs);
    })();
  }, []);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-activity")
      .on("postgres_changes", { event: "INSERT", schema: "anthem", table: "projects" }, (p) => {
        const r = p.new as { id: string; title: string; created_at: string };
        const ev: ActivityEvent = { id: `p-${r.id}`, type: "project", title: "ผลงานใหม่", subtitle: r.title, at: r.created_at };
        setEvents((e) => [ev, ...e].slice(0, 50));
      })
      .on("postgres_changes", { event: "INSERT", schema: "anthem", table: "job_posts" }, (p) => {
        const r = p.new as { id: string; title: string; created_at: string };
        const ev: ActivityEvent = { id: `j-${r.id}`, type: "job", title: "ประกาศงานใหม่", subtitle: r.title, at: r.created_at };
        setEvents((e) => [ev, ...e].slice(0, 50));
      })
      .on("postgres_changes", { event: "INSERT", schema: "anthem", table: "hiring_requests" }, (p) => {
        const r = p.new as { id: string; project_title: string; client_name: string; created_at: string };
        const ev: ActivityEvent = { id: `h-${r.id}`, type: "hire", title: "คำขอจ้างงาน", subtitle: `${r.client_name} → ${r.project_title}`, at: r.created_at };
        setEvents((e) => [ev, ...e].slice(0, 50));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (p) => {
        const r = p.new as { id: string; display_name: string; created_at: string };
        const ev: ActivityEvent = { id: `u-${r.id}`, type: "user", title: "สมาชิกใหม่", subtitle: r.display_name || "ไม่ระบุชื่อ", at: r.created_at };
        setEvents((e) => [ev, ...e].slice(0, 50));
      })

      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return events;
}

const pick = <T>(data: T[] | null | undefined, map: (r: T) => ActivityEvent): ActivityEvent[] =>
  (data ?? []).map(map);

const EVENT_TYPE_MAP: Record<string, ActivityEventType> = {
  "user.signup": "user",
  "project.created": "project",
  "project.like": "like",
  "project.comment": "comment",
  "user.follow": "follow",
  "hire.request": "hire",
  "collab.request": "collab",
  "job.posted": "job",
  "job.application": "job",
  "gift.sent": "gift",
  "report.created": "report",
  "feedback.created": "feedback",
  "cashout.requested": "cashout",
  "kyc.submitted": "kyc",
  "aml.flagged": "aml",
  "chat.message": "message",
  "collection.created": "collection",
  "contract.created": "admin",
  "studio.created": "studio",
};

const EVENT_TITLE: Record<string, string> = {
  "user.signup": "สมาชิกใหม่",
  "project.created": "ผลงานใหม่",
  "project.like": "กดถูกใจ",
  "project.comment": "คอมเมนต์ใหม่",
  "user.follow": "ติดตามใหม่",
  "hire.request": "คำขอจ้างงาน",
  "collab.request": "คำขอคอลแลป",
  "job.posted": "ประกาศงานใหม่",
  "job.application": "ใบสมัครงาน",
  "gift.sent": "ส่งของขวัญ",
  "report.created": "รายงานเนื้อหา",
  "feedback.created": "ฟีดแบ็กใหม่",
  "cashout.requested": "คำขอถอนเงิน",
  "kyc.submitted": "คำขอ KYC",
  "aml.flagged": "AML flag",
  "chat.message": "ข้อความแชต",
  "collection.created": "คอลเลกชันใหม่",
  "contract.created": "สัญญาใหม่",
  "studio.created": "สตูดิโอใหม่",
};

function mapPlatformEventRow(r: {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}): ActivityEvent {
  const meta = r.metadata ?? {};
  const subtitle =
    (meta.title as string) ||
    (meta.display_name as string) ||
    (meta.name as string) ||
    (meta.project_title as string) ||
    (meta.reason as string) ||
    (meta.content as string) ||
    (meta.message as string) ||
    r.event_type;
  let link: string | undefined;
  if (r.target_type === "project" && r.target_id) link = `/project/${r.target_id}`;
  else if (r.target_type === "job" && r.target_id) link = `/jobs/${r.target_id}`;
  else if (r.target_type === "user" && r.target_id) link = `/u/${r.target_id}`;
  else if (r.event_type === "report.created") link = "/admin/reports";
  else if (r.event_type === "cashout.requested") link = "/admin/wallet";
  else if (r.event_type === "job.application") link = "/admin/applications";
  else if (r.event_type === "contract.created") link = "/admin/contracts";
  else if (r.actor_id) link = `/u/${r.actor_id}`;

  return {
    id: r.id,
    type: EVENT_TYPE_MAP[r.event_type] ?? "admin",
    title: EVENT_TITLE[r.event_type] ?? r.event_type,
    subtitle: String(subtitle).slice(0, 120),
    at: r.created_at,
    actorId: r.actor_id ?? undefined,
    targetId: r.target_id ?? undefined,
    link,
  };
}

async function fetchPlatformActivityPolling(limit: number): Promise<ActivityEvent[]> {
      const [
        users, projects, jobs, hires, collabs, studios,
        likes, comments, follows, gifts, reports, feedback,
        collections, inspire, msgs, cashouts, kyc, aml, audit,
      ] = await Promise.all([
        supabase.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }).limit(15),
        supabase.from("projects").select("id,title,created_at").order("created_at", { ascending: false }).limit(15),
        supabase.from("job_posts").select("id,title,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("hiring_requests").select("id,project_title,client_name,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("collab_requests").select("id,message,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("studios").select("id,name,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("project_likes").select("user_id,project_id,created_at").order("created_at", { ascending: false }).limit(15),
        supabase.from("project_comments").select("id,user_id,project_id,content,created_at").order("created_at", { ascending: false }).limit(15),
        supabase.from("follows").select("follower_id,following_id,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("gift_transactions").select("id,sender_id,recipient_id,price_px,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("user_reports" as never).select("id,reporter_id,target_type,target_id,reason,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("app_feedback" as never).select("id,user_id,feature,message,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("collections").select("id,name,user_id,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("inspire_boards").select("id,title,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("messages").select("id,conversation_id,sender_id,content,created_at").order("created_at", { ascending: false }).limit(15),
        supabase.from("cashout_requests").select("id,user_id,gross_px,status,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("kyc_requests").select("id,user_id,status,submitted_at").order("submitted_at", { ascending: false }).limit(10),
        supabase.from("aml_flags").select("id,user_id,flag_type,status,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("admin_audit_log").select("id,actor_id,action,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(15),
      ]);

      const evs: ActivityEvent[] = [
        ...pick(users.data, (r) => ({
          id: `u-${r.id}`, type: "user" as const, title: "สมาชิกใหม่",
          subtitle: r.display_name || "ไม่ระบุชื่อ", at: r.created_at,
          actorId: r.id, link: `/u/${r.id}`,
        })),
        ...pick(projects.data, (r) => ({
          id: `p-${r.id}`, type: "project" as const, title: "ผลงานใหม่",
          subtitle: r.title, at: r.created_at, targetId: r.id, link: `/project/${r.id}`,
        })),
        ...pick(jobs.data, (r) => ({
          id: `j-${r.id}`, type: "job" as const, title: "ประกาศงานใหม่",
          subtitle: r.title, at: r.created_at, targetId: r.id, link: `/jobs/${r.id}`,
        })),
        ...pick(hires.data, (r) => ({
          id: `h-${r.id}`, type: "hire" as const, title: "คำขอจ้างงาน",
          subtitle: `${r.client_name} → ${r.project_title}`, at: r.created_at, link: "/admin/hiring",
        })),
        ...pick(collabs.data, (r) => ({
          id: `c-${r.id}`, type: "collab" as const, title: "คำขอคอลแลป",
          subtitle: r.message?.slice(0, 80) ?? "", at: r.created_at, link: "/admin/collabs",
        })),
        ...pick(studios.data, (r) => ({
          id: `s-${r.id}`, type: "studio" as const, title: "สตูดิโอใหม่",
          subtitle: r.name, at: r.created_at, link: "/admin/studios",
        })),
        ...pick(likes.data, (r) => ({
          id: `lk-${r.user_id}-${r.project_id}`, type: "like" as const, title: "กดถูกใจผลงาน",
          subtitle: r.project_id.slice(0, 8) + "…", at: r.created_at,
          actorId: r.user_id, targetId: r.project_id, link: `/project/${r.project_id}`,
        })),
        ...pick(comments.data, (r) => ({
          id: `cm-${r.id}`, type: "comment" as const, title: "คอมเมนต์ใหม่",
          subtitle: r.content?.slice(0, 80) ?? "", at: r.created_at,
          actorId: r.user_id, targetId: r.project_id, link: `/project/${r.project_id}`,
        })),
        ...pick(follows.data, (r) => ({
          id: `fl-${r.follower_id}-${r.following_id}`, type: "follow" as const, title: "ติดตามใหม่",
          subtitle: `${r.follower_id.slice(0, 8)}… → ${r.following_id.slice(0, 8)}…`, at: r.created_at,
          actorId: r.follower_id, targetId: r.following_id, link: `/u/${r.following_id}`,
        })),
        ...pick(gifts.data, (r) => ({
          id: `gf-${r.id}`, type: "gift" as const, title: "ส่งของขวัญ",
          subtitle: `${r.price_px} PX`, at: r.created_at,
          actorId: r.sender_id, targetId: r.recipient_id, link: "/admin/gifts",
        })),
        ...pick(reports.data as { id: string; reporter_id: string; target_type: string; target_id: string; reason: string; created_at: string }[], (r) => ({
          id: `rp-${r.id}`, type: "report" as const, title: "รายงานเนื้อหา",
          subtitle: `${r.target_type}: ${r.reason}`, at: r.created_at,
          actorId: r.reporter_id, targetId: r.target_id, link: "/admin/reports",
        })),
        ...pick(feedback.data as { id: string; user_id: string; feature: string; message: string; created_at: string }[], (r) => ({
          id: `fb-${r.id}`, type: "feedback" as const, title: "ฟีดแบ็กใหม่",
          subtitle: `[${r.feature}] ${r.message?.slice(0, 60) ?? ""}`, at: r.created_at,
          actorId: r.user_id, link: "/admin/feedback",
        })),
        ...pick(collections.data, (r) => ({
          id: `col-${r.id}`, type: "collection" as const, title: "คอลเลกชันใหม่",
          subtitle: r.name, at: r.created_at, actorId: r.user_id, link: "/admin/collections",
        })),
        ...pick(inspire.data, (r) => ({
          id: `in-${r.id}`, type: "inspire" as const, title: "Inspire board ใหม่",
          subtitle: r.title, at: r.created_at, link: "/admin/inspire",
        })),
        ...pick(msgs.data, (r) => ({
          id: `msg-${r.id}`, type: "message" as const, title: "ข้อความแชต",
          subtitle: r.content?.slice(0, 80) ?? "", at: r.created_at,
          actorId: r.sender_id, link: "/admin/chats",
        })),
        ...pick(cashouts.data, (r) => ({
          id: `co-${r.id}`, type: "cashout" as const, title: `ถอนเงิน (${r.status})`,
          subtitle: `฿${r.gross_px?.toLocaleString() ?? "—"}`, at: r.created_at,
          actorId: r.user_id, link: "/admin/wallet",
        })),
        ...pick(kyc.data, (r) => ({
          id: `kyc-${r.id}`, type: "kyc" as const, title: "คำขอ KYC",
          subtitle: r.status, at: r.submitted_at, actorId: r.user_id, link: "/admin/kyc",
        })),
        ...pick(aml.data, (r) => ({
          id: `aml-${r.id}`, type: "aml" as const, title: "AML flag",
          subtitle: `${r.flag_type} · ${r.status}`, at: r.created_at,
          actorId: r.user_id, link: "/admin/aml",
        })),
        ...pick(audit.data, (r) => ({
          id: `ad-${r.id}`, type: "admin" as const, title: `แอดมิน: ${r.action}`,
          subtitle: `${r.target_type}/${r.target_id.slice(0, 8)}…`, at: r.created_at,
          actorId: r.actor_id, link: "/admin/audit",
        })),
      ];

      return evs.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function usePlatformActivity(limit = 80) {
  return useQuery<ActivityEvent[]>({
    queryKey: ["admin-platform-activity", limit],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("admin_list_platform_events", { _limit: limit });
      if (!error && rows && rows.length > 0) {
        return (rows as Parameters<typeof mapPlatformEventRow>[0][]).map(mapPlatformEventRow);
      }
      return fetchPlatformActivityPolling(limit);
    },
  });
}
