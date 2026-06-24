import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { tierLabel } from "@/lib/subscriptionTiers";
import { cn } from "@/lib/utils";

interface SidebarUpgradeBadgeProps {
  collapsed?: boolean;
}

export function SidebarUpgradeBadge({ collapsed = false }: SidebarUpgradeBadgeProps) {
  const { tier, isPro, isLoading } = useSubscription();
  const label = isPro ? tierLabel(tier) : "อัปเกรด";
  const title = isPro ? `แพ็กเกจ ${label} — ดูราคาและจัดการแผน` : "อัปเกรดแพ็กเกจ";

  if (collapsed) {
    return (
      <Link
        to="/pricing"
        title={title}
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          isPro
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-white text-primary shadow-soft hover:bg-white/90",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPro ? (
          <Crown className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </Link>
    );
  }

  return (
    <Link
      to="/pricing"
      title={title}
      className={cn(
        "flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
        isPro
          ? "bg-white/15 text-white hover:bg-white/25 border border-white/20"
          : "bg-white text-primary shadow-soft hover:bg-white/90",
      )}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : isPro ? (
        <Crown className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{isLoading ? "…" : label}</span>
    </Link>
  );
}
