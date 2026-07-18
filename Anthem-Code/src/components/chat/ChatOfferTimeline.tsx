import { Circle, CircleDot, Flag, Repeat, Wallet } from "lucide-react";
import {
  formatOfferDateShort,
  offerDisplayMilestones,
  offerDurationDays,
  offerTimelineEvents,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import { cn } from "@/lib/utils";

type Props = {
  offer: Pick<
    ChatOfferPayload,
    | "startDate"
    | "endDate"
    | "dueDate"
    | "depositDueDate"
    | "milestones"
    | "depositPercent"
    | "showFullTimeline"
  >;
  compact?: boolean;
  className?: string;
  light?: boolean;
  title?: string;
};

export function ChatOfferTimeline({
  offer,
  compact,
  className,
  light,
  title = "ไทม์ไลน์อัตโนมัติ",
}: Props) {
  const events = offerTimelineEvents(offer);
  const days = offerDurationDays(offer.startDate, offer.endDate || offer.dueDate);
  const milestones = offerDisplayMilestones(offer).filter((m) => m.label);

  // Prefer display milestone list (with empty dates) when present; else dated events only
  const rows =
    milestones.length > 0
      ? milestones.map((m, i, arr) => ({
          label: m.label,
          date: m.date || "",
          type: (i === 0 ? "deposit" : i === arr.length - 1 ? "end" : "milestone") as
            | "deposit"
            | "start"
            | "milestone"
            | "end",
        }))
      : events;

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed",
        light
          ? "border-primary/25 bg-primary/5"
          : "border-primary/30 bg-primary/10",
        compact ? "p-2 space-y-1.5" : "p-3 space-y-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "font-semibold text-primary inline-flex items-center gap-1",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          <Repeat className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
          {title}
        </p>
        {days != null ? (
          <span
            className={cn(
              "text-muted-foreground tabular-nums",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {days} วัน
          </span>
        ) : null}
      </div>
      <ol className="space-y-1">
        {rows.map((e, i) => {
          const Icon =
            e.type === "deposit" ? Wallet : e.type === "end" ? Flag : e.type === "start" ? CircleDot : Circle;
          return (
            <li key={`${e.label}-${i}`} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 min-w-0">
                <Icon className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                <span className={cn("truncate", compact ? "text-[11px]" : "text-xs")}>{e.label}</span>
              </span>
              <span className="tabular-nums text-muted-foreground shrink-0">
                {e.date ? formatOfferDateShort(e.date) : "—"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
