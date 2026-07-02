import { useMutation } from "@tanstack/react-query";
import { anthemDb } from "@/integrations/supabase/db";
import { toast } from "sonner";

export type UxResearchScores = {
  first_impression: number;
  thai_copy: number;
  navigation: number;
  next_step: number;
  px_system: number;
  hire_collab: number;
  mobile_ux: number;
  overall: number;
};

export type UxResearchAnswers = {
  good: [string, string, string];
  fix: [string, string, string];
  other?: string;
};

export type SubmitUxResearchInput = {
  reviewer_name: string;
  persona: string;
  devices: string[];
  tasks_done: string[];
  sections_done: string[];
  scores: UxResearchScores;
  answers: UxResearchAnswers;
};

function friendly(msg: string): string {
  const stripped = msg.replace(/^(RATE_LIMIT|AUTH|INVALID):\s*/, "");
  if (/could not find the function|function .* does not exist|PGRST202/i.test(msg)) {
    return "ระบบส่งผลทดสอบยังไม่พร้อม — กรุณาลองใหม่ภายหลัง";
  }
  if (/permission denied|42501/i.test(msg)) {
    return "ไม่มีสิทธิ์ส่งผลทดสอบ — ลองใหม่อีกครั้ง";
  }
  if (/relation .* does not exist|42P01/i.test(msg)) {
    return "ระบบกำลังอัปเดต — ลองใหม่อีกครั้งในไม่กี่นาที";
  }
  return stripped || "ส่งผลทดสอบไม่สำเร็จ — ลองใหม่อีกครั้ง";
}

export function useSubmitUxResearchFeedback() {
  return useMutation({
    mutationFn: async (input: SubmitUxResearchInput) => {
      const viewport =
        typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

      const { data, error } = await anthemDb.rpc("submit_ux_research" as never, {
        payload: {
          ...input,
          viewport,
          user_agent: userAgent,
        },
      } as never);

      if (error) throw error;
      return data as string;
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "ส่งผลทดสอบไม่สำเร็จ";
      if (raw.startsWith("RATE_LIMIT:")) toast.warning(friendly(raw));
      else toast.error(friendly(raw));
    },
  });
}
