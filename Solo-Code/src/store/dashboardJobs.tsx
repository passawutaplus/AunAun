import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export interface DashboardJob {
  id: string;
  brand: string;
  task: string;
  done: boolean;
  dueDate?: string | null;
  sortOrder: number;
}

export type DashboardJobInput = Partial<Omit<DashboardJob, "id">>;

const key = (uid: string | null) => ["dashboard_jobs", uid] as const;

export function useDashboardJobs() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: key(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_jobs")
        .select("*")
        .order("done", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r): DashboardJob => ({
          id: r.id,
          brand: r.brand ?? "",
          task: r.task ?? "",
          done: !!r.done,
          dueDate: r.due_date,
          sortOrder: r.sort_order ?? 0,
        }),
      );
    },
  });

  React.useEffect(() => {
    if (!userId) return;
    const channelName = `dashboard_jobs_${userId}_${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_jobs", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: key(userId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const add = useMutation({
    mutationFn: async (j: DashboardJobInput) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { error } = await supabase.from("dashboard_jobs").insert({
        user_id: userId,
        brand: j.brand ?? "",
        task: j.task ?? "",
        done: j.done ?? false,
        due_date: j.dueDate ?? null,
        sort_order: j.sortOrder ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DashboardJobInput }) => {
      const row: {
        brand?: string;
        task?: string;
        done?: boolean;
        due_date?: string | null;
        sort_order?: number;
      } = {};
      if (patch.brand !== undefined) row.brand = patch.brand;
      if (patch.task !== undefined) row.task = patch.task;
      if (patch.done !== undefined) row.done = patch.done;
      if (patch.dueDate !== undefined) row.due_date = patch.dueDate ?? null;
      if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
      const { error } = await supabase.from("dashboard_jobs").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  return {
    list: query.data ?? [],
    isLoading: query.isLoading,
    add: add.mutateAsync,
    update: (id: string, patch: DashboardJobInput) => update.mutateAsync({ id, patch }),
    remove: remove.mutateAsync,
  };
}
