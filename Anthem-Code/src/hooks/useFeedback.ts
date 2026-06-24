import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface SubmitFeedbackInput {
  feature: string;
  route: string;
  rating: number;
  message?: string;
  project_id?: string | null;
}

function friendly(msg: string): string {
  const stripped = msg.replace(/^(RATE_LIMIT|AUTH|INVALID):\s*/, "");
  if (/could not find the function|function .* does not exist|PGRST202/i.test(msg)) {
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
  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      if (!user) throw new Error("AUTH: ต้องเข้าสู่ระบบก่อน");
      const viewport =
        typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("submit_feedback", {
        _feature: input.feature,
        _route: input.route,
        _rating: input.rating,
        _message: input.message ?? "",
        _project_id: input.project_id ?? null,
        _user_agent: userAgent,
        _viewport: viewport,
      });
      if (error) throw error;
      return data;
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "ส่งฟีดแบ็กไม่สำเร็จ";
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
      const { data, error } = await supabase
        .from("app_feedback" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        feature: string;
        route: string;
        rating: number;
        message: string;
        status: "new" | "reviewing" | "resolved" | "dismissed";
        admin_note: string;
        project_id: string | null;
        created_at: string;
      }>;
    },
  });
}
