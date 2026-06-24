import { cn } from "@/lib/utils";
import { creditAiBarSegments, type CreditAiBarInput } from "@/lib/aiCredits";

type CreditAiBarProps = CreditAiBarInput & {
  size?: "sm" | "md";
  isLoading?: boolean;
  /** Sidebar gradient track */
  variant?: "default" | "sidebar";
  className?: string;
};

const HEIGHT = { sm: "h-1.5", md: "h-2" } as const;

export function CreditAiBar({
  dailyRemaining,
  dailyLimit,
  poolRemaining,
  poolCapacity,
  size = "md",
  isLoading = false,
  variant = "default",
  className,
}: CreditAiBarProps) {
  const { dailyPct, poolPct } = creditAiBarSegments({
    dailyRemaining,
    dailyLimit,
    poolRemaining,
    poolCapacity,
  });

  const trackClass =
    variant === "sidebar" ? "bg-white/25" : "bg-muted";

  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full rounded-full overflow-hidden animate-pulse",
          HEIGHT[size],
          trackClass,
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn("w-full rounded-full overflow-hidden flex", HEIGHT[size], trackClass, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(dailyPct + poolPct)}
    >
      {dailyPct > 0 && (
        <div
          className="h-full bg-amber-400 border-r-2 border-background/80 shrink-0"
          style={{ width: `${dailyPct}%` }}
        />
      )}
      {poolPct > 0 && (
        <div
          className={cn(
            "h-full shrink-0",
            variant === "sidebar" ? "bg-white" : "bg-primary",
          )}
          style={{ width: `${poolPct}%` }}
        />
      )}
    </div>
  );
}
