import { cn } from "@/lib/utils";

/** Horizontal load bar with percent at the trailing end. */
export function LoadPercentBar({
  percent,
  className,
  label = "กำลังโหลด",
}: {
  percent: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={cn("flex w-full max-w-[200px] items-center gap-2", className)}>
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
  );
}
