import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ActivityKind = "like" | "bookmark" | "comment";

export interface ActivityNotif {
  id: string;
  kind: ActivityKind;
  createdAt: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  projectId: string;
  projectTitle: string;
  projectCover: string;
  content?: string;
}

async function fetchConversationIds(requestIds: string[]): Promise<Record<string, string>> {
  if (requestIds.length === 0) return {};
  const { data } = await supabase
    .from("conversations")
    .select("id, request_id")
    .in("request_id", requestIds);
  const map: Record<string, string> = {};
  (data ?? []).forEach((c) => {
    if (c.request_id) map[c.request_id as string] = c.id as string;
  });
  return map;
}

const fetchProfiles = async (ids: string[]) => {
  if (ids.length === 0) return {} as Record<string, { name: string; avatar: string }>;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", ids);
  const map: Record<string, { name: string; avatar: string }> = {};
  (data ?? []).forEach((p) => {
    map[p.user_id ?? p.id] = { name: p.display_name || p.username || "ผู้ใช้", avatar: p.avatar_url ?? "" };
  });
  return map;
};

export const useActivityNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notif-activity", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ActivityNotif[]> => {
      const { data: myProjects } = await supabase
        .from("projects")
        .select("id, title, cover_url")
        .eq("owner_id", user!.id);
      const projects = myProjects ?? [];
      if (projects.length === 0) return [];
      const projectIds = projects.map((p) => p.id);
      const projectMap: Record<string, { title: string; cover: string }> = {};
      projects.forEach((p) => (projectMap[p.id] = { title: p.title, cover: p.cover_url ?? "" }));

      const [likesRes, bookmarksRes, commentsRes] = await Promise.all([
        supabase
          .from("project_likes")
          .select("project_id, user_id, created_at")
          .in("project_id", projectIds)
          .neq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("project_bookmarks")
          .select("project_id, user_id, created_at")
          .in("project_id", projectIds)
          .neq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("project_comments")
          .select("id, project_id, user_id, content, created_at")
          .in("project_id", projectIds)
          .neq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const actorIds = new Set<string>();
      (likesRes.data ?? []).forEach((r) => actorIds.add(r.user_id));
      (bookmarksRes.data ?? []).forEach((r) => actorIds.add(r.user_id));
      (commentsRes.data ?? []).forEach((r) => actorIds.add(r.user_id));
      const profMap = await fetchProfiles(Array.from(actorIds));

      const items: ActivityNotif[] = [];
      (likesRes.data ?? []).forEach((r) => {
        const p = projectMap[r.project_id];
        const a = profMap[r.user_id];
        items.push({
          id: `like-${r.project_id}-${r.user_id}-${r.created_at}`,
          kind: "like",
          createdAt: r.created_at,
          actorId: r.user_id,
          actorName: a?.name ?? "ผู้ใช้",
          actorAvatar: a?.avatar ?? "",
          projectId: r.project_id,
          projectTitle: p?.title ?? "",
          projectCover: p?.cover ?? "",
        });
      });
      (bookmarksRes.data ?? []).forEach((r) => {
        const p = projectMap[r.project_id];
        const a = profMap[r.user_id];
        items.push({
          id: `bm-${r.project_id}-${r.user_id}-${r.created_at}`,
          kind: "bookmark",
          createdAt: r.created_at,
          actorId: r.user_id,
          actorName: a?.name ?? "ผู้ใช้",
          actorAvatar: a?.avatar ?? "",
          projectId: r.project_id,
          projectTitle: p?.title ?? "",
          projectCover: p?.cover ?? "",
        });
      });
      (commentsRes.data ?? []).forEach((r) => {
        const p = projectMap[r.project_id];
        const a = profMap[r.user_id];
        items.push({
          id: `cm-${r.id}`,
          kind: "comment",
          createdAt: r.created_at,
          actorId: r.user_id,
          actorName: a?.name ?? "ผู้ใช้",
          actorAvatar: a?.avatar ?? "",
          projectId: r.project_id,
          projectTitle: p?.title ?? "",
          projectCover: p?.cover ?? "",
          content: r.content,
        });
      });
      items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return items;
    },
  });
};

export interface HireNotif {
  id: string;
  createdAt: string;
  clientName: string;
  email: string;
  projectTitle: string;
  message: string | null;
  status: string;
  budgetAmount: number | null;
  clientId: string | null;
  freelancerId: string;
  projectId: string | null;
  conversationId: string | null;
}

export const useHireNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notif-hire", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<HireNotif[]> => {
      const { data } = await supabase
        .from("hiring_requests")
        .select("id, created_at, client_name, email, project_title, message, status, budget_amount, client_id, freelancer_id, project_id")
        .eq("freelancer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = data ?? [];
      const convMap = await fetchConversationIds(rows.map((r) => r.id));
      return rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        clientName: r.client_name,
        email: r.email,
        projectTitle: r.project_title,
        message: r.message,
        status: r.status,
        budgetAmount: r.budget_amount,
        clientId: r.client_id,
        freelancerId: r.freelancer_id,
        projectId: r.project_id,
        conversationId: convMap[r.id] ?? null,
      }));
    },
  });
};

export interface CollabNotif {
  id: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  collabTypes: string[];
  message: string;
  timeline: string | null;
  status: string;
  recipientId: string;
  projectId: string | null;
  conversationId: string | null;
}

export const useCollabNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notif-collab", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<CollabNotif[]> => {
      const { data } = await supabase
        .from("collab_requests")
        .select("id, created_at, sender_id, recipient_id, project_id, collab_types, message, timeline, status")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const [profMap, convMap] = await Promise.all([
        fetchProfiles(Array.from(new Set(rows.map((r) => r.sender_id)))),
        fetchConversationIds(rows.map((r) => r.id)),
      ]);
      return rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        senderId: r.sender_id,
        senderName: profMap[r.sender_id]?.name ?? "ผู้ใช้",
        senderAvatar: profMap[r.sender_id]?.avatar ?? "",
        collabTypes: r.collab_types ?? [],
        message: r.message,
        timeline: r.timeline,
        status: r.status,
        recipientId: r.recipient_id,
        projectId: r.project_id,
        conversationId: convMap[r.id] ?? null,
      }));
    },
  });
};
