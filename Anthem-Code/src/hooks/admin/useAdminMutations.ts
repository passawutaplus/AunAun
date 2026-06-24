import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminListKey } from "@/hooks/admin/useAdminList";
import { notifyAnthem } from "@/lib/notifyAnthem";

function invalidateLists(qc: ReturnType<typeof useQueryClient>, tables: string[]) {
  tables.forEach((table) => qc.invalidateQueries({ queryKey: adminListKey(table) }));
}

export function useAdminSetProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_project_status", { _id: id, _status: status });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLists(qc, ["projects"]);
      qc.invalidateQueries({ queryKey: ["admin-gift-overview"] });
    },
  });
}

export function useAdminDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_project", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidateLists(qc, ["projects"]),
  });
}

export function useAdminDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_comment", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidateLists(qc, ["project_comments"]),
  });
}

export function useAdminDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_collection", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidateLists(qc, ["collections"]),
  });
}

export function useAdminSetJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_job_status", { _id: id, _status: status });
      if (error) throw error;
    },
    onSuccess: () => invalidateLists(qc, ["job_posts"]),
  });
}

export function useAdminSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: "admin" | "user"; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_role", {
        _user_id: userId,
        _role: role,
        _grant: grant,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLists(qc, ["profiles"]);
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
  });
}

export function useAdminUpdateGiftLimits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      daily_unverified: number;
      daily_verified: number;
      velocity: number;
      hold_hours: number;
      max_topup: number;
    }) => {
      const { error } = await supabase.rpc("admin_update_gift_limits", {
        _daily_unverified: p.daily_unverified,
        _daily_verified: p.daily_verified,
        _velocity: p.velocity,
        _hold_hours: p.hold_hours,
        _max_topup: p.max_topup,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gift-limits"] });
    },
  });
}

export function useAdminUpdateGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active, price_px }: { id: string; active: boolean; price_px?: number }) => {
      const { error } = await supabase.rpc("admin_update_gift", {
        _id: id,
        _active: active,
        _price_px: price_px ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gifts-catalog"] }),
  });
}

export function useAdminRejectCashout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc("admin_reject_cashout", { _id: id, _note: note ?? "" });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      notifyAnthem({ event: "cashout", request_id: id, status: "rejected" });
      qc.invalidateQueries({ queryKey: ["admin-cashouts"] });
      qc.invalidateQueries({ queryKey: ["admin-gift-overview"] });
    },
  });
}

export function useAdminDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_dismiss_notification", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
}
