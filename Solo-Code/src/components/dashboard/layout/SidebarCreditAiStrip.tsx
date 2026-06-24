import { Zap, Loader2 } from "lucide-react";
import { CreditAiBar } from "@/components/dashboard/credits/CreditAiBar";
import { useAiUsage } from "@/hooks/useAiUsage";
import { poolRemainingFromSummary } from "@/lib/aiCredits";
import { cn } from "@/lib/utils";

interface SidebarCreditAiStripProps {
  collapsed: boolean;
  onOpenSettings: () => void;
}

export function SidebarCreditAiStrip({ collapsed, onOpenSettings }: SidebarCreditAiStripProps) {
  const {
    total_remaining,
    daily_remaining,
    daily_limit,
    included_limit,
    included_remaining,
    purchased_balance,
    isLoading,
  } = useAiUsage();

  const poolRemaining = poolRemainingFromSummary({ included_remaining, purchased_balance });
  const poolCapacity = Math.max(included_limit, poolRemaining, 0);
  const label = `Credit AI: เหลือ ${total_remaining.toLocaleString("th-TH")} เครดิต`;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        title={label}
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-white",
          "hover:bg-white/15 transition-colors",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4 text-amber-300" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      title={label}
      className={cn(
        "w-full flex items-center gap-2 rounded-lg px-2 py-2 mb-1",
        "text-white hover:bg-white/15 transition-colors text-left",
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/80" />
      ) : (
        <Zap className="h-4 w-4 shrink-0 text-amber-300" />
      )}
      <CreditAiBar
        size="sm"
        variant="sidebar"
        dailyRemaining={daily_remaining}
        dailyLimit={daily_limit}
        poolRemaining={poolRemaining}
        poolCapacity={poolCapacity}
        isLoading={isLoading}
        className="flex-1 min-w-0"
      />
      <span className="text-[11px] font-semibold tabular-nums shrink-0 text-white">
        {isLoading ? "…" : total_remaining.toLocaleString("th-TH")}
      </span>
    </button>
  );
}
