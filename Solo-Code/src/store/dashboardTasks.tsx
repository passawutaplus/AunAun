import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export interface DashboardTask {
  id: string;
  title: string;
  done: boolean;
  sortOrder: number;
}

export type DashboardTaskInput = Partial<Omit<DashboardTask, "id">>;

const key = (uid: string | null) => ["dashboard_tasks", uid] as const;

export function useDashboardTasks() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: key(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_tasks")
        .select("*")
        .order("done", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r): DashboardTask => ({
          id: r.id,
          title: r.title ?? "",
          done: !!r.done,
          sortOrder: r.sort_order ?? 0,
        }),
      );
    },
  });

  React.useEffect(() => {
    if (!userId) return;
    const channelName = `dashboard_tasks_${userId}_${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_tasks", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: key(userId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const add = useMutation({
    mutationFn: async (t: DashboardTaskInput) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { error } = await supabase.from("dashboard_tasks").insert({
        user_id: userId,
        title: t.title ?? "",
        done: t.done ?? false,
        sort_order: t.sortOrder ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DashboardTaskInput }) => {
      const row: { title?: string; done?: boolean; sort_order?: number } = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.done !== undefined) row.done = patch.done;
      if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
      const { error } = await supabase.from("dashboard_tasks").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  return {
    list: query.data ?? [],
    isLoading: query.isLoading,
    add: add.mutateAsync,
    update: (id: string, patch: DashboardTaskInput) => update.mutateAsync({ id, patch }),
    remove: remove.mutateAsync,
  };
}
