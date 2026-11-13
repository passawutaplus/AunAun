import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import type { PipelineDeal } from "@/store/pipeline";

type TimelineItem = {
  id: string;
  label: string;
  detail?: string;
  at: string;
};

export function DealTimeline({ deal }: { deal: PipelineDeal }) {
  const q = deal.quotation;

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
      {items.length === 0 ? (
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
