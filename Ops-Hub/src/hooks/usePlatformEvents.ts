import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export type ActivityFilter = "all" | "ecosystem" | "so1o" | "an1hem";

const EVENT_LABELS: Record<string, string> = {
  "user.signup": "สมาชิกใหม่",
  "project.created": "สร้างผลงาน",
  "project.published": "เผยแพร่ผลงาน",
  "hire.request": "คำขอจ้าง",
  "report.created": "รายงานเนื้อหา",
  "feedback.created": "ฟีดแบ็กใหม่",
  "cashout.request": "ขอถอน Pixel",
  "kyc.submitted": "ส่ง KYC",
  "aml.flagged": "แจ้งเตือน AML",
  "ticket.created": "ตั๋วซัพพอร์ตใหม่",
  "ecosystem.cross_link": "Cross-link ข้ามแอป",
  "ecosystem.handoff_completed": "Handoff สำเร็จ",
  "subscription.upgraded": "อัปเกรด Pro",
};

const ECOSYSTEM_PREFIXES = ["ecosystem."];

export function eventLabel(type: string) {
  return EVENT_LABELS[type] ?? type;
}

function matchesFilter(ev: PlatformEvent, filter: ActivityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "ecosystem") {
    return ECOSYSTEM_PREFIXES.some((p) => ev.event_type.startsWith(p));
  }
  if (filter === "so1o") {
    return ev.event_type.startsWith("ticket.") || ev.target_type === "support_ticket";
  }
  if (filter === "an1hem") {
    return (
      ev.event_type.startsWith("project.") ||
      ev.event_type.startsWith("report.") ||
      ev.event_type.startsWith("feedback.") ||
      ev.event_type.startsWith("hire.")
    );
  }
  return true;
}

export function usePlatformEvents(limit = 50, filter: ActivityFilter = "all") {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("platform-events-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "platform_events" },
        () => {
          void qc.invalidateQueries({ queryKey: ["platform-events"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["platform-events", limit, filter],
    queryFn: async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc("admin_list_platform_events", {
        _limit: limit * 2,
      });

      if (!rpcError && rpcData) {
        return (rpcData as PlatformEvent[]).filter((ev) => matchesFilter(ev, filter)).slice(0, limit);
      }

      const { data, error } = await supabase
        .from("platform_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit * 2);

      if (error?.code === "PGRST205") return [];
      if (error) throw error;
      return ((data ?? []) as PlatformEvent[]).filter((ev) => matchesFilter(ev, filter)).slice(0, limit);
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
