import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type { InhouseTask } from "@/lib/inhouse/types";

async function enrichTasks(tasks: InhouseTask[]): Promise<InhouseTask[]> {
  const assigneeIds = [...new Set(tasks.map((t) => t.assignee_id).filter(Boolean))] as string[];
  if (assigneeIds.length === 0) return tasks;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", assigneeIds);
  const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return tasks.map((t) => ({
    ...t,
    assignee:
      t.assignee_id && map.get(t.assignee_id)
        ? {
            display_name: map.get(t.assignee_id)!.display_name,
            avatar_url: map.get(t.assignee_id)!.avatar_url,
          }
        : undefined,
  }));
}

export function useInhouseTasks(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inhouse-tasks", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inhouse_tasks")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return enrichTasks((data ?? []) as InhouseTask[]);
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    const ch = supabase
      .channel(`inhouse-tasks-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inhouse_tasks",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["inhouse-tasks", workspaceId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [workspaceId, queryClient]);

  return query;
}

export function useCreateInhouseTask(orgId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (opts: {
      workspaceId: string;
      title: string;
      columnKey?: string;
      assigneeId?: string | null;
      priority?: string;
      dueDate?: string | null;
    }) => {
      const { data: existing } = await supabase
        .from("inhouse_tasks")
        .select("position")
        .eq("workspace_id", opts.workspaceId)
        .eq("column_key", opts.columnKey ?? "todo")
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = ((existing?.[0] as { position?: number } | undefined)?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from("inhouse_tasks")
        .insert({
          workspace_id: opts.workspaceId,
          title: opts.title.trim(),
          column_key: opts.columnKey ?? "todo",
          assignee_id: opts.assigneeId ?? null,
          priority: opts.priority ?? "medium",
          due_date: opts.dueDate ?? null,
          position: nextPos,
          created_by: user!.id,
        })
        .select("*")
        .single();
      if (error) throw error;

      await supabase.rpc("log_inhouse_activity", {
        _org_id: orgId,
        _workspace_id: opts.workspaceId,
        _event_type: "task_created",
        _metadata: { task_id: data.id, title: opts.title },
      });

      return data as InhouseTask;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inhouse-tasks", vars.workspaceId] });
    },
  });
}

export function useUpdateInhouseTask(orgId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opts: {
      id: string;
      workspaceId: string;
      patch: Partial<
        Pick<
          InhouseTask,
          | "title"
          | "description"
          | "column_key"
          | "assignee_id"
          | "priority"
          | "due_date"
          | "position"
        >
      >;
      eventType?: string;
    }) => {
      const { data, error } = await supabase
        .from("inhouse_tasks")
        .update({ ...opts.patch, updated_at: new Date().toISOString() })
        .eq("id", opts.id)
        .select("*")
        .single();
      if (error) throw error;

      if (opts.eventType) {
        await supabase.rpc("log_inhouse_activity", {
          _org_id: orgId,
          _workspace_id: opts.workspaceId,
          _event_type: opts.eventType,
          _metadata: { task_id: opts.id, ...opts.patch },
        });
      }

      return data as InhouseTask;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inhouse-tasks", vars.workspaceId] });
    },
  });
}

export function useDeleteInhouseTask(orgId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opts: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from("inhouse_tasks").delete().eq("id", opts.id);
      if (error) throw error;
      await supabase.rpc("log_inhouse_activity", {
        _org_id: orgId,
        _workspace_id: opts.workspaceId,
        _event_type: "task_deleted",
        _metadata: { task_id: opts.id },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inhouse-tasks", vars.workspaceId] });
    },
  });
}
