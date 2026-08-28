import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anthemDb } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { FeedbackKind } from "@/lib/feedbackTicket";

export interface SubmitFeedbackInput {
  feature: string;
  route: string;
  rating?: number | null;
  message?: string;
  project_id?: string | null;
  kind?: FeedbackKind | null;
  screenshot_path?: string | null;
  annotation_json?: { comments?: unknown[] } | null;
}

export type FeedbackRow = {
  id: string;
  feature: string;
  route: string;
  rating: number | null;
  message: string;
  status: "new" | "reviewing" | "resolved" | "dismissed";
  admin_note: string;
  project_id: string | null;
  kind: string | null;
  ticket_number: string | null;
  screenshot_path: string;
  annotation_json?: unknown;
  created_at: string;
};

function errorText(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [o.message, o.details, o.hint, o.code].filter((p) => typeof p === "string" && p.trim());
    if (parts.length) return parts.join(" ");
  }
  if (err instanceof Error) return err.message;
  return "ส่งฟีดแบ็กไม่สำเร็จ";
}

function friendly(msg: string): string {
  const stripped = msg.replace(/^(RATE_LIMIT|AUTH|INVALID):\s*/, "");
  if (/could not find the function|function .* does not exist|PGRST202|404|not found/i.test(msg)) {
    return "ระบบฟีดแบ็กยังไม่พร้อม — กรุณาลองใหม่ภายหลัง";
  }
  if (/permission denied|42501/i.test(msg)) {
    return "ไม่มีสิทธิ์ส่งฟีดแบ็ก — ลองเข้าสู่ระบบใหม่";
  }
  if (/relation .* does not exist|42P01/i.test(msg)) {
    return "ระบบฟีดแบ็กกำลังอัปเดต — ลองใหม่อีกครั้งในไม่กี่นาที";
  }
  return stripped || "ส่งฟีดแบ็กไม่สำเร็จ — ลองใหม่อีกครั้ง";
}

export function useSubmitFeedback() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      if (!user) throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      const viewport =
        typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const { data, error } = await anthemDb.rpc("submit_feedback" as never, {
        _feature: input.feature,
        _route: input.route,
        _rating: input.rating ?? null,
        _message: input.message ?? "",
        _project_id: input.project_id ?? null,
        _user_agent: userAgent,
        _viewport: viewport,
        _kind: input.kind ?? null,
        _screenshot_path: input.screenshot_path ?? null,
        _annotation_json: input.annotation_json ?? { comments: [] },
      } as never);
      if (error) throw error;
      return (data ?? null) as FeedbackRow | null;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["feedback", "mine"] });
    },
    onError: (err: unknown) => {
      const raw = errorText(err);
      if (raw.startsWith("RATE_LIMIT:")) toast.warning(friendly(raw));
      else toast.error(friendly(raw));
    },
  });
}

export function useMyFeedback() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feedback", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await anthemDb
        .from("app_feedback" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackRow[];
    },
  });
}
