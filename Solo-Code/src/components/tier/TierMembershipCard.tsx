import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  Crown,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlanId } from "@/data/plans";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/utils/payments.functions";
import { currentOriginReturnUrl } from "@/lib/paymentRedirect";
import { getStripeEnvironment } from "@/lib/stripe";
import { allowedUpgradeTargets, isPaidTier, tierLabel } from "@/lib/subscriptionTiers";
import { getTierMetrics, getTierTagline, TIER_CARD_STYLES } from "@/lib/tierMembership";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function TierMembershipCard({ className }: Props) {
  const { tier, isPro, isActive, isLoading, subscription } = useSubscription();
  const portal = useServerFn(createPortalSession);
  const [portalBusy, setPortalBusy] = React.useState(false);

  const style = TIER_CARD_STYLES[tier];
  const Icon = style.icon;
  const metrics = getTierMetrics(tier);
  const tagline = getTierTagline(tier);
  const paidTier = isPaidTier(tier) ? tier : null;
  const upgradeTargets = paidTier ? allowedUpgradeTargets(paidTier) : [];
  const nextUpgrade: PlanId | null = upgradeTargets[0] ?? (tier === "free" ? "pro" : null);

  const renewsAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  async function openPortal() {
    setPortalBusy(true);
    try {
      const res = await portal({
        data: { environment: getStripeEnvironment(), returnUrl: currentOriginReturnUrl() },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปิดหน้าจัดการไม่ได้");
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br",
        style.gradient,
        className,
      )}
      aria-labelledby="tier-membership-heading"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn("rounded-xl bg-white/10 p-2", style.accent)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <h2 id="tier-membership-heading" className="text-lg font-bold tracking-tight">
                    {tierLabel(tier)} Member
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">{tagline}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isPro && isActive && renewsAt && !isLoading && (
              <p className="text-[10px] sm:text-xs text-muted-foreground text-right leading-snug max-w-[180px]">
                {subscription?.cancel_at_period_end
                  ? `สิ้นสุด ${renewsAt}`
                  : `ต่ออายุถัดไป: ${renewsAt}`}
              </p>
            )}
            <div className="flex items-center gap-1">
              {!isLoading && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-white/10 bg-white/10",
                    isPro && "text-primary border-primary/20 bg-primary/15",
                  )}
                >
                  {isPro ? <Crown className="h-3 w-3 mr-1" /> : null}
                  {tierLabel(tier)}
                </Badge>
              )}
              <Link
                to="/pricing"
                hash="tier-details"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label="ดูรายละเอียดแพ็กเกจ"
              >
                <Info className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {subscription?.status === "past_due" && (
          <p className="mt-3 text-xs text-destructive">
            การชำระเงินล่าสุดไม่สำเร็จ — กรุณาอัปเดตบัตร
          </p>
        )}

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

        <div className="mt-4 flex flex-wrap gap-2">
          {!isPro ? (
            <Button asChild size="sm" className="gap-1.5 rounded-full">
              <Link to="/pricing">
                <Sparkles className="h-3.5 w-3.5" />
                อัพเกรด Pro
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-full border-white/15 bg-white/5"
              onClick={openPortal}
              disabled={portalBusy}
            >
              {portalBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CreditCard className="h-3.5 w-3.5" />
              )}
              จัดการการชำระเงิน
            </Button>
          )}
          {nextUpgrade && isPro && (
            <Button asChild size="sm" className="gap-1.5 rounded-full">
              <Link to="/pricing" hash="tier-details">
                อัพเกรด {tierLabel(nextUpgrade)}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-full border-white/15 bg-white/5"
          >
            <Link to="/pricing" hash="tier-details">
              ดูสิทธิ์ทั้งหมด
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
            <Link to="/pricing">ดูแผนราคา</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
            <Link to="/refund">นโยบายคืนเงิน</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
