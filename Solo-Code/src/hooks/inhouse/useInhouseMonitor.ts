import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InhouseActivityEvent, InhouseTask } from "@/lib/inhouse/types";
import { useInhouseOrgMembers } from "./useInhouseOrg";
import { useInhouseTasks } from "./useInhouseTasks";

async function enrichActivity(events: InhouseActivityEvent[]): Promise<InhouseActivityEvent[]> {
  const userIds = [...new Set(events.map((e) => e.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) return events;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", userIds);
  const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return events.map((e) => ({
    ...e,
    user:
      e.user_id && map.get(e.user_id)
        ? {
            display_name: map.get(e.user_id)!.display_name,
            avatar_url: map.get(e.user_id)!.avatar_url,
          }
        : undefined,
  }));
}

export function useInhouseActivity(orgId: string | undefined, workspaceId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inhouse-activity", orgId, workspaceId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("inhouse_activity_events")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (workspaceId) {
        q = q.eq("workspace_id", workspaceId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return enrichActivity((data ?? []) as InhouseActivityEvent[]);
    },
  });

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`inhouse-act-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inhouse_activity_events",
          filter: `org_id=eq.${orgId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["inhouse-activity", orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, queryClient]);

  return query;
}

export interface MemberTaskSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  todo: number;
  doing: number;
  overdue: number;
  lastActive: string | null;
}

export function useInhouseMonitor(
  orgId: string | undefined,
  orgSlug: string | undefined,
  workspaceId?: string,
) {
  const { data: members = [] } = useInhouseOrgMembers(orgId);
  const { data: tasks = [] } = useInhouseTasks(workspaceId);
  const { data: activity = [] } = useInhouseActivity(orgId, workspaceId);

  const activeMembers = members.filter((m) => m.status === "active");
  const today = new Date().toISOString().slice(0, 10);

  const memberSummaries: MemberTaskSummary[] = activeMembers.map((m) => {
    const userTasks = workspaceId ? tasks.filter((t) => t.assignee_id === m.user_id) : [];
    const lastEvent = activity.find((e) => e.user_id === m.user_id);

    return {
      userId: m.user_id,
      displayName: m.profile?.display_name ?? m.profile?.email ?? "Member",
      avatarUrl: m.profile?.avatar_url ?? null,
      role: m.role,
      todo: userTasks.filter((t) => t.column_key === "todo" || t.column_key === "backlog").length,
      doing: userTasks.filter((t) => t.column_key === "doing" || t.column_key === "review").length,
      overdue: userTasks.filter((t) => t.due_date && t.due_date < today && t.column_key !== "done")
        .length,
      lastActive: lastEvent?.created_at ?? m.joined_at,
    };
  });

  return {
    members: activeMembers,
    memberSummaries,
    activity,
    taskStats: {
      total: tasks.length,
      inProgress: tasks.filter((t) => ["doing", "review"].includes(t.column_key)).length,
      overdue: tasks.filter((t) => t.due_date && t.due_date < today && t.column_key !== "done")
        .length,
      done: tasks.filter((t) => t.column_key === "done").length,
    },
  };
}

export function useLogInhouseWorkspaceView(
  orgId: string | undefined,
  workspaceId: string | undefined,
) {
  useEffect(() => {
    if (!orgId || !workspaceId) return;
    void supabase.rpc("log_inhouse_activity", {
      _org_id: orgId,
      _workspace_id: workspaceId,
      _event_type: "workspace_view",
      _metadata: {},
    });
  }, [orgId, workspaceId]);
}

export function tasksByColumn(tasks: InhouseTask[], columns: string[]) {
  const map: Record<string, InhouseTask[]> = {};
  for (const col of columns) map[col] = [];
  for (const t of tasks) {
    const key = columns.includes(t.column_key) ? t.column_key : (columns[0] ?? "todo");
    map[key].push(t);
  }
  for (const col of columns) {
    map[col].sort((a, b) => a.position - b.position);
  }
  return map;
}
