import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineDeal } from "@/store/pipeline";

type TimelineItem = {
  id: string;
  label: string;
  detail?: string;
  at: string;
};

export function DealTimeline({ deal }: { deal: PipelineDeal }) {
  const q = deal.quotation;

  const eventsQuery = useQuery({
    queryKey: ["deal_timeline", q.id, deal.job?.id],
    enabled: !!deal.job?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_events")
        .select("id, title, note, created_at")
        .eq("job_id", deal.job!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const items: TimelineItem[] = [];

  if (q.briefId) {
    items.push({
      id: "brief",
      label: "Smart Brief",
      detail: "เชื่อมบรีฟกับดีล",
      at: q.createdAt,
    });
  }

  items.push({
    id: "quote-created",
    label: `ใบเสนอราคา ${q.number}`,
    detail: "สร้างดีล",
    at: q.createdAt,
  });

  if (q.contractAccepted && q.contractSignedAt) {
    items.push({
      id: "contract",
      label: "สัญญาจ้าง",
      detail: "ยืนยันแล้ว",
      at: q.contractSignedAt,
    });
  }

  if (deal.job) {
    items.push({
      id: "job",
      label: "Job Tracker",
      detail: `ขั้น ${deal.job.currentStep + 1}/6`,
      at: q.updatedAt,
    });
  }

  for (const ev of eventsQuery.data ?? []) {
    items.push({
      id: ev.id,
      label: ev.title || "อัปเดตงาน",
      detail: ev.note || undefined,
      at: ev.created_at,
    });
  }

  if (deal.hasIncome) {
    items.push({
      id: "income",
      label: "บันทึกรายได้",
      detail: `฿${deal.incomeGross?.toLocaleString("th-TH") ?? "—"}`,
      at: q.paidAt || q.updatedAt,
    });
  }

  if (q.status === "completed") {
    items.push({
      id: "done",
      label: "ปิดงาน",
      at: q.updatedAt,
    });
  }

  items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">Timeline ดีล</p>
      {eventsQuery.isLoading && deal.job ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          ยังไม่มีเหตุการณ์ — ลากดีลใน Pipeline เพื่ออัปเดตสถานะ
        </p>
      ) : (
        <ul className="space-y-2 border-l-2 border-[#FF5F05]/30 pl-3">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[calc(0.75rem+5px)] top-1.5 h-2 w-2 rounded-full bg-[#FF5F05]" />
              <p className="text-xs font-medium leading-tight">{item.label}</p>
              {item.detail && <p className="text-[10px] text-muted-foreground">{item.detail}</p>}
              <p className="text-[10px] text-muted-foreground/80">
                {formatDistanceToNow(new Date(item.at), { addSuffix: true, locale: th })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
