import { useBetaBadge } from "@/hooks/useBetaBadge";
import { BETA_TIERS, betaBadgeLabel, nextBetaTier } from "@/lib/betaBadge";
import { cn } from "@/lib/utils";

/** Progress toward the next Beta badge tier. `tone="onBrand"` for gradient backgrounds. */
export default function BetaProgress({
  userId,
  tone = "default",
  className,
}: {
  userId: string | null | undefined;
  tone?: "default" | "onBrand";
  className?: string;
}) {
  const { data } = useBetaBadge(userId);
  if (!data) return null;
  const next = nextBetaTier(data.count);
  const current = betaBadgeLabel(data);
  const prevMin = [...BETA_TIERS].reverse().find((t) => data.count >= t.min)?.min ?? 0;
  const pct = next ? Math.round(((data.count - prevMin) / (next.min - prevMin)) * 100) : 100;
  const onBrand = tone === "onBrand";

  return (
    <div className={cn("text-left", className)}>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className={cn("font-semibold", onBrand ? "text-white" : "text-foreground")}>
          {current ?? "ยังไม่มี badge"}
        </span>
        <span className={onBrand ? "text-white/80" : "text-muted-foreground"}>{data.points} แต้ม</span>
      </div>
      <div className={cn("mt-1.5 h-1.5 overflow-hidden rounded-full", onBrand ? "bg-white/25" : "bg-muted")}>
        <div
          className={cn("h-full rounded-full transition-[width]", onBrand ? "bg-white" : "bg-primary")}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      <p className={cn("mt-1.5 text-[11px]", onBrand ? "text-white/80" : "text-muted-foreground")}>
        {next ? `อีก ${next.remaining} ฟีดแบ็ก จะได้ ${next.label}` : "ได้ badge สูงสุดแล้ว ขอบคุณที่ช่วยกัน"}
      </p>
    </div>
  );
}
