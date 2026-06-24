import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export interface BetaFeedback {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  feature: string;
  message: string;
  rating: number | null;
  createdAt: string;
}

interface Row {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  feature: string;
  message: string;
  rating: number | null;
  created_at: string;
}

const KEY_MINE = (uid?: string) => ["beta_feedback_mine", uid ?? "anon"] as const;
const KEY_ALL = ["beta_feedback_all"] as const;

function rowToFb(r: Row): BetaFeedback {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    userName: r.user_name,
    feature: r.feature,
    message: r.message,
    rating: r.rating,
    createdAt: r.created_at,
  };
}

/** Hook for ordinary users — submit + view their own. */
export function useMyBetaFeedback(feature?: string) {
  const { user, profile } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: [...KEY_MINE(uid), feature ?? "*"],
    enabled: !!uid,
    queryFn: async () => {
      let q = supabase
        .from("beta_feedback")
        .select("*")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (feature) q = q.eq("feature", feature);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => rowToFb(r as unknown as Row));
    },
  });

  const submit = useMutation({
    mutationFn: async (input: { feature: string; message: string; rating?: number | null }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const { data, error } = await supabase
        .from("beta_feedback")
        .insert({
          user_id: uid,
          user_email: user?.email ?? null,
          user_name: profile?.display_name ?? null,
          feature: input.feature,
          message: input.message,
          rating: input.rating ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_MINE(uid) });
      qc.invalidateQueries({ queryKey: KEY_ALL });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beta_feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_MINE(uid) });
      qc.invalidateQueries({ queryKey: KEY_ALL });
    },
  });

  return {
    items: list.data ?? [],
    isLoading: list.isLoading,
    submit: submit.mutateAsync,
    remove: remove.mutateAsync,
  };
}

/** Hook for admins — view all + delete any. */
export function useAllBetaFeedback() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY_ALL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beta_feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToFb(r as unknown as Row));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beta_feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_ALL }),
  });

  return {
    items: list.data ?? [],
    isLoading: list.isLoading,
    refetch: list.refetch,
    remove: remove.mutateAsync,
  };
}
