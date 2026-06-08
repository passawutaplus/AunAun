import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";

export type PlatformEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  "user.signup": "สมาชิกใหม่",
  "project.created": "สร้างผลงาน",
  "project.published": "เผยแพร่ผลงาน",
  "hire.request": "คำขอจ้าง",
  "report.created": "รายงานเนื้อหา",
  "feedback.created": "ฟีดแบ็กใหม่",
  "cashout.request": "ขอถอน Pixel",
  "kyc.submitted": "ส่ง KYC",
  "aml.flagged": "AML flag",
  "ticket.created": "ตั๋ว support",
};

export function eventLabel(type: string) {
  return EVENT_LABELS[type] ?? type;
}

export function usePlatformEvents(limit = 50) {
  return useQuery({
    queryKey: ["platform-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // #region agent log
      fetch("http://127.0.0.1:7706/ingest/3280a2f8-8fa2-40c7-88fc-16d5430418e8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88285d" },
        body: JSON.stringify({
          sessionId: "88285d",
          runId: "post-fix",
          hypothesisId: "B",
          location: "usePlatformEvents.ts:queryFn",
          message: "platform events query",
          data: { code: error?.code ?? null, message: error?.message ?? null, count: data?.length ?? 0 },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (error?.code === "PGRST205") return [];
      if (error) throw error;
      return (data ?? []) as PlatformEvent[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
