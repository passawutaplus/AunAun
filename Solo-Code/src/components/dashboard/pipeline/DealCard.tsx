import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatBaht } from "@/store/quotations";
import type { PipelineDeal } from "@/store/pipeline";

export function DealCard({
  deal,
  onClick,
  dragging = false,
}: {
  deal: PipelineDeal;
  onClick: () => void;
  dragging?: boolean;
}) {
  const q = deal.quotation;
  const badges: string[] = [];
  if (deal.job) badges.push(`Job ${deal.job.currentStep + 1}/6`);
  if (deal.job && deal.job.pendingSlips > 0) {
    badges.push(`สลิปรอตรวจ ${deal.job.pendingSlips}`);
  }
  if (deal.hasIncome) badges.push("บันทึกรายได้แล้ว");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow",
        dragging && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-[10px] font-mono font-bold text-[#FF5F05]">{q.number}</span>
        <span className="text-[10px] font-semibold text-foreground shrink-0">
          ฿{formatBaht(deal.grandTotal)}
        </span>
      </div>
      <p className="text-xs font-medium line-clamp-2 leading-snug">{q.projectName}</p>
      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{q.clientName}</p>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="text-[9px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground"
            >
              {b}
            </span>
          ))}
        </div>
      )}
      <p className="text-[9px] text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(q.updatedAt), { addSuffix: true, locale: th })}
      </p>
    </button>
  );
}
