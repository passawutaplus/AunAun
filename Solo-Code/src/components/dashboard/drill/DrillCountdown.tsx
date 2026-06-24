import { Clock } from "lucide-react";
import { useDrillCountdown } from "@/hooks/useDrillCountdown";
import { cn } from "@/lib/utils";

type Props = {
  startedAt: number | null;
  totalMinutes: number;
};

export function DrillCountdown({ startedAt, totalMinutes }: Props) {
  const { formatted, isExpired, progress, remainingMs } = useDrillCountdown(
    startedAt,
    totalMinutes,
  );

  const remainingMin = remainingMs / 60_000;
  const tone =
    isExpired ? "expired" : remainingMin < 5 ? "critical" : remainingMin < 15 ? "warning" : "normal";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        tone === "expired" && "border-destructive/30 bg-destructive/5",
        tone === "critical" && "border-destructive/40 bg-destructive/5",
        tone === "warning" && "border-amber-500/40 bg-amber-500/5",
        tone === "normal" && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {isExpired ? "หมดเวลาแล้ว" : "เวลาที่เหลือ"}
        </div>
        <span
          className={cn(
            "font-mono text-2xl font-bold tabular-nums tracking-tight",
            tone === "expired" && "text-destructive",
            tone === "critical" && "text-destructive",
            tone === "warning" && "text-amber-600 dark:text-amber-400",
            tone === "normal" && "text-primary",
          )}
        >
          {formatted}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-linear",
            tone === "expired" && "bg-destructive",
            tone === "critical" && "bg-destructive",
            tone === "warning" && "bg-amber-500",
            tone === "normal" && "bg-primary",
          )}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {isExpired && (
        <p className="text-xs text-muted-foreground">
          หมดเวลาแล้ว — ทำต่อหรือกดเสร็จได้เลย
        </p>
      )}
    </div>
  );
}
