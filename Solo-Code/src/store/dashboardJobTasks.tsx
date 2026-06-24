import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export interface DashboardJobTask {
  id: string;
  jobId: string;
  title: string;
  done: boolean;
  sortOrder: number;
}

export type DashboardJobTaskInput = Partial<Omit<DashboardJobTask, "id">>;

const key = (uid: string | null) => ["dashboard_job_tasks", uid] as const;

export function useDashboardJobTasks() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: key(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_job_tasks")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (r): DashboardJobTask => ({
          id: r.id,
          jobId: r.job_id,
          title: r.title ?? "",
          done: !!r.done,
          sortOrder: r.sort_order ?? 0,
        }),
      );
    },
  });

  React.useEffect(() => {
    if (!userId) return;
    const channelName = `dashboard_job_tasks_${userId}_${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dashboard_job_tasks",
          filter: `user_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: key(userId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const add = useMutation({
    mutationFn: async (t: DashboardJobTaskInput & { jobId: string }) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { error } = await supabase.from("dashboard_job_tasks").insert({
        user_id: userId,
        job_id: t.jobId,
        title: t.title ?? "",
        done: t.done ?? false,
        sort_order: t.sortOrder ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DashboardJobTaskInput }) => {
      const row: { title?: string; done?: boolean; sort_order?: number } = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.done !== undefined) row.done = patch.done;
      if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
      const { error } = await supabase.from("dashboard_job_tasks").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_job_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  return {
    list: query.data ?? [],
    isLoading: query.isLoading,
    add: (t: DashboardJobTaskInput & { jobId: string }) => add.mutateAsync(t),
    update: (id: string, patch: DashboardJobTaskInput) => update.mutateAsync({ id, patch }),
    remove: remove.mutateAsync,
  };
}
