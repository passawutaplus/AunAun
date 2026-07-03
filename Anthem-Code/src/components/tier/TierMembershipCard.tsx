import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight, ExternalLink, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/data/plans";
import { useSubscription } from "@/core/subscription";
import { SO1O_PRICING_URL } from "@/lib/productLinks";
import {
  getNextTier,
  getTierMetrics,
  getTierTagline,
  getUpgradeTargets,
  normalizePlanId,
  TIER_CARD_STYLES,
  tierLabel,
  tierProgress,
} from "@/lib/tierMembership";
import { cn } from "@/lib/utils";
import { isAplus1UpgradeEnabled, UPGRADE_PATH } from "@/lib/aplus1Launch";

type Props = {
  className?: string;
  infoHref?: string;
};

export function TierMembershipCard({
  className,
  infoHref = "/upgrade#tier-details",
}: Props) {
  const { tier: rawTier, isPro, isActive, isLoading, subscription } = useSubscription();
  const tier = normalizePlanId(rawTier);
  const style = TIER_CARD_STYLES[tier];
  const Icon = style.icon;
  const metrics = getTierMetrics(tier);
  const tagline = getTierTagline(tier);
  const nextTier = getNextTier(tier);
  const upgradeTargets = getUpgradeTargets(tier);
  const nextUpgrade: PlanId | null = upgradeTargets[0] ?? null;

  const renewsAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br glass-panel dark:border-border",
        style.gradient,
        className,
      )}
      aria-labelledby="tier-membership-heading"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-foreground/5 blur-2xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn("rounded-xl bg-foreground/10 p-2 dark:bg-foreground/10", style.accent)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <h2
                    id="tier-membership-heading"
                    className="text-lg font-bold tracking-tight"
                  >
                    {tierLabel(tier)} Member
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">{tagline}</p>
                </>
              )}
            </div>
          </div>
          <Link
            to={infoHref}
            className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="ดูรายละเอียดแพ็กเกจ"
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl bg-black/20 px-2.5 py-2 text-center backdrop-blur-sm dark:bg-black/30"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>

        {nextTier && tier !== "inhouse" && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>ระดับสมาชิก</span>
              <span>ถัดไป: {tierLabel(nextTier)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-primary/80 transition-all"
                style={{ width: `${tierProgress(tier)}%` }}
              />
            </div>
          </div>
        )}

        {isPro && isActive && renewsAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            {subscription?.cancel_at_period_end
              ? `สิ้นสุด ${renewsAt}`
              : `ต่ออายุถัดไป ${renewsAt}`}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {nextUpgrade && !isAplus1UpgradeEnabled() && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-full">
              <Link to={UPGRADE_PATH}>
                อัพเกรด {tierLabel(nextUpgrade)} — เร็ว ๆ นี้
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {nextUpgrade && isAplus1UpgradeEnabled() && (
            <Button asChild size="sm" className="gap-1.5 rounded-full">
              <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer">
                อัพเกรด {tierLabel(nextUpgrade)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-full border-border bg-secondary/50 dark:bg-secondary/80"
          >
            <Link to="/upgrade#tier-details">
              ดูสิทธิ์ทั้งหมด
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {isPro && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="gap-1.5 rounded-full text-muted-foreground"
            >
              <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer">
                จัดการที่ So1o
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
