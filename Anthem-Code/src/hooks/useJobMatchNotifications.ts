import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isOptionalQueryError } from "@/lib/supabaseErrors";

export interface JobMatchNotif {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  match_reasons: string[];
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  job?: {
    id: string;
    title: string;
    role_category: string;
    post_type: "hiring" | "seeking";
    employment_type: string;
    location: string;
    studio_id: string | null;
    posted_by: string;
  };
}

export const useJobMatchNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("jmn-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "job_match_notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["job-match-notif", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return useQuery({
    queryKey: ["job-match-notif", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<JobMatchNotif[]> => {
      const { data, error } = await supabase
        .from("job_match_notifications")
        .select("*")
        .eq("is_dismissed", false)
        .order("match_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        if (isOptionalQueryError(error)) return [];
        throw error;
      }
      const rows = (data ?? []) as JobMatchNotif[];
      const ids = Array.from(new Set(rows.map((r) => r.job_id)));
      if (ids.length === 0) return rows;
      const { data: jobs } = await supabase
        .from("job_posts")
        .select("id, title, role_category, post_type, employment_type, location, studio_id, posted_by")
        .in("id", ids);
      const map = new Map((jobs ?? []).map((j: any) => [j.id, j]));
      return rows.map((r) => ({ ...r, job: map.get(r.job_id) }));
    },
  });
};

export const useUnreadJobMatchCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["job-match-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("job_match_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .eq("is_dismissed", false);
      if (error && isOptionalQueryError(error)) return 0;
      if (error) throw error;
      return count ?? 0;
    },
  });
};

export const useMarkJobMatchRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_match_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-match-notif"] });
      qc.invalidateQueries({ queryKey: ["job-match-unread"] });
    },
  });
};

export const useDismissJobMatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("job_match_notifications")
        .update({ is_dismissed: true, is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-match-notif"] });
      qc.invalidateQueries({ queryKey: ["job-match-unread"] });
    },
  });
};

export const useMarkAllJobMatchRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("job_match_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-match-notif"] });
      qc.invalidateQueries({ queryKey: ["job-match-unread"] });
    },
  });
};
