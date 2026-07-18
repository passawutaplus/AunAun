import { cn } from "@/lib/utils";
import { useAutoPercent } from "@/hooks/useAutoPercent";

/** Horizontal load bar with percent at the trailing end, optional visible caption. */
export function LoadPercentBar({
  percent,
  className,
  label = "กำลังโหลด",
  showLabel = false,
}: {
  percent: number;
  className?: string;
  label?: string;
  /** Show `label` as visible caption text above the bar (short explanation of what's happening). */
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={cn("flex w-full max-w-[220px] flex-col gap-1", className)}>
      {showLabel ? (
        <span className="truncate text-center text-[11px] font-medium text-foreground/80">
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
    </div>
  );
}

/**
 * Like `LoadPercentBar`, but ramps a simulated percent when `percent` is
 * unknown (e.g. network upload with no progress events) instead of freezing.
 * Switches to the real value the moment one is reported.
 */
export function AutoLoadPercentBar({
  percent,
  className,
  label,
  showLabel,
}: {
  percent?: number | null;
  className?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const shown = useAutoPercent(percent);
  return <LoadPercentBar percent={shown} label={label} showLabel={showLabel} className={className} />;
}
