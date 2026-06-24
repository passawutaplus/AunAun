import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

const key = (uid: string | null) => ["dashboard_notes", uid] as const;

export function useDashboardNotes() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: key(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_notes")
        .select("content")
        .maybeSingle();
      if (error) throw error;
      return data?.content ?? "";
    },
  });

  const save = useMutation({
    mutationFn: async (content: string) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { error } = await supabase
        .from("dashboard_notes")
        .upsert({ user_id: userId, content }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });

  return {
    content: query.data ?? "",
    isLoading: query.isLoading,
    save: save.mutateAsync,
  };
}
