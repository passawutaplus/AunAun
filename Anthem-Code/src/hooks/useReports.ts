import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type ReportTargetType =
  | "user"
  | "project"
  | "comment"
  | "studio"
  | "message"
  | "job"
  | "community_post"
  | "community_comment";
export type ReportReason =
  | "spam"
  | "harassment"
  | "nsfw"
  | "copyright"
  | "scam"
  | "impersonation"
  | "other";

export interface EvidenceFile {
  url: string;
  type: string;
  name: string;
  size: number;
}

export interface CreateReportInput {
  target_type: ReportTargetType;
  target_id: string;
  target_owner_id?: string | null;
  reason: ReportReason;
  details: string;
  evidence_urls?: string[];
  evidence_files?: EvidenceFile[];
}

function friendlyError(msg: string): string {
  if (msg.startsWith("RATE_LIMIT:")) return msg.replace("RATE_LIMIT:", "").trim();
  if (msg.startsWith("DUPLICATE:")) return msg.replace("DUPLICATE:", "").trim();
  if (msg.startsWith("AUTH:")) return msg.replace("AUTH:", "").trim();
  if (msg.startsWith("INVALID:")) return msg.replace("INVALID:", "").trim();
  return msg;
}

export function useCreateReport() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      if (!user) throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("create_report", {
        _target_type: input.target_type,
        _target_id: input.target_id,
        _target_owner_id: input.target_owner_id ?? null,
        _reason: input.reason,
        _details: input.details,
        _evidence_urls: input.evidence_urls ?? [],
        _evidence_files: input.evidence_files ?? [],
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", "mine"] });
      toast.success("รายงานถูกส่งแล้ว ขอบคุณที่ช่วยดูแลชุมชน");
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "ส่งรายงานไม่สำเร็จ";
      const msg = friendlyError(raw);
      if (raw.startsWith("DUPLICATE:")) toast.info(msg);
      else if (raw.startsWith("RATE_LIMIT:")) toast.warning(msg);
      else toast.error(msg);
    },
  });
}

export function useMyReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reports", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        target_type: string;
        target_id: string;
        reason: string;
        details: string;
        status: "open" | "reviewing" | "resolved" | "dismissed";
        admin_note: string;
        evidence_urls: string[];
        evidence_files: EvidenceFile[];
        created_at: string;
        updated_at: string;
      }>;
    },
  });
}
