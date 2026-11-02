import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  fetchConsentStatus,
  recordPolicyReconsent,
  submitCopyrightReport,
  submitPrivacyRequest,
  type CopyrightReportInput,
  type PrivacyRequestType,
} from "@/lib/legalCompliance";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";

export function useConsentStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consent-status", user?.id],
    queryFn: fetchConsentStatus,
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useRecordReconsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ terms, privacy }: { terms: boolean; privacy: boolean }) => {
      await recordPolicyReconsent(terms, privacy);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consent-status"] });
      toast.success("บันทึกการยอมรับนโยบายแล้ว");
    },
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "บันทึกไม่สำเร็จ"));
    },
  });
}

export function useSubmitCopyrightReport() {
  return useMutation({
    mutationFn: (input: CopyrightReportInput) => submitCopyrightReport(input),
    onSuccess: () => toast.success("ส่งคำร้องแล้ว — ทีมงานจะตรวจสอบและติดต่อกลับ"),
    onError: (err: unknown) => {
      toast.error(mapWriteFlowError(err, "ส่งคำร้องไม่สำเร็จ"));
    },
  });
}

export function useSubmitPrivacyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, description }: { type: PrivacyRequestType; description?: string }) =>
      submitPrivacyRequest(type, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["privacy-requests"] });
      toast.success("ส่งคำขอแล้ว — เราจะตอบกลับทางอีเมลภายใน 7 วันทำการ");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "ส่งคำขอไม่สำเร็จ";
      if (msg.includes("รอดำเนินการ")) toast.info(msg);
      else toast.error(mapWriteFlowError(err, msg));
    },
  });
}

export function useMyPrivacyRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["privacy-requests", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("privacy_requests" as never)
          .select("id, request_type, status, requested_at, completed_at, scheduled_purge_at")
          .order("requested_at", { ascending: false })
          .limit(10);
        if (error) return [];
        return (data ?? []) as Array<{
          id: string;
          request_type: string;
          status: string;
          requested_at: string;
          completed_at: string | null;
          scheduled_purge_at: string | null;
        }>;
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });
}

/** Cancels the signed-in user's own pending or approved account deletion (before the purge date). */
export function useCancelAccountDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("account-deletion-cancel", { body: {} });
      if (error) throw error;
      return (data as { cancelled?: boolean } | null)?.cancelled === true;
    },
    onSuccess: (cancelled) => {
      qc.invalidateQueries({ queryKey: ["privacy-requests"] });
      if (cancelled) toast.success("ยกเลิกคำขอลบบัญชีแล้ว — โปรไฟล์และผลงานกลับมาแสดงตามเดิม");
      else toast.info("ไม่มีคำขอลบบัญชีที่ยกเลิกได้");
    },
    onError: () => toast.error("ยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง"),
  });
}

/** Admin: approve a delete request — hides the account now and purges it in 30 days. */
export function useApproveAccountDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_approve_account_deletion", { _request_id: requestId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "privacy-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "compliance"] });
      toast.success("อนุมัติแล้ว — ซ่อนบัญชีทันที และลบถาวรใน 30 วัน");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "อนุมัติไม่สำเร็จ")),
  });
}

export function useAdminComplianceOverview() {
  return useQuery({
    queryKey: ["admin", "compliance"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_compliance_overview");
      if (error) throw error;
      return data as {
        open_reports: number;
        copyright_new: number;
        privacy_new: number;
        privacy_delete: number;
        consents_7d: number;
        cookie_logs_7d: number;
      };
    },
    refetchInterval: 60_000,
  });
}
