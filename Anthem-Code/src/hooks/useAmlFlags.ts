import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AmlFlag {
  id: string;
  user_id: string;
  flag_type: "velocity" | "circular_transfer" | "new_account_burst" | "large_amount" | "self_network" | "manual";
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
  status: "open" | "reviewing" | "dismissed" | "actioned";
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: { display_name?: string; username?: string; avatar_url?: string } | null;
}

export const useAmlOverview = () =>
  useQuery({
    queryKey: ["aml-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_aml_overview");
      if (error) throw error;
      return data as Record<string, number>;
    },
  });

export const useAmlFlags = (status: "open" | "all" = "open") =>
  useQuery({
    queryKey: ["aml-flags", status],
    queryFn: async () => {
      let q = supabase.from("aml_flags").select("*").order("created_at", { ascending: false }).limit(200);
      if (status === "open") q = q.eq("status", "open");
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as AmlFlag[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length === 0) return rows;
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url, risk_score, account_status").in("user_id", userIds);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
    },
  });

export const useFrozenAccounts = () =>
  useQuery({
    queryKey: ["frozen-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, account_status, frozen_at, frozen_reason, risk_score, is_verified")
        .in("account_status", ["frozen", "under_review"])
        .order("frozen_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useHighRiskUsers = () =>
  useQuery({
    queryKey: ["high-risk-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, account_status, risk_score, is_verified, created_at")
        .gte("risk_score", 50)
        .order("risk_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useResolveAmlFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "dismiss" | "escalate" | "freeze"; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_resolve_aml_flag", { _flag_id: id, _action: action, _note: note ?? "" });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aml-flags"] });
      qc.invalidateQueries({ queryKey: ["aml-overview"] });
      qc.invalidateQueries({ queryKey: ["frozen-accounts"] });
    },
  });
};

export const useFreezeAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { data, error } = await supabase.rpc("admin_freeze_account", { _user_id: userId, _reason: reason });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["frozen-accounts"] });
      qc.invalidateQueries({ queryKey: ["aml-overview"] });
    },
  });
};

export const useUnfreezeAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc("admin_unfreeze_account", { _user_id: userId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["frozen-accounts"] });
      qc.invalidateQueries({ queryKey: ["aml-overview"] });
    },
  });
};
