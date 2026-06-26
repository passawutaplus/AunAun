import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Zap, Loader2, Sparkles, CreditCard, Crown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreditAiBar } from "@/components/dashboard/credits/CreditAiBar";
import { useSubscription } from "@/hooks/useSubscription";
import { useAiUsage } from "@/hooks/useAiUsage";
import {
  creditAiTotalCapacity,
  describeAiCreditsPlan,
  formatAiPeriodEnd,
  formatDailyResetAt,
  poolRemainingFromSummary,
} from "@/lib/aiCredits";
import { aplus1ShowcaseUrl } from "@/lib/productLinks";
import { createPortalSession } from "@/utils/payments.functions";
import { currentOriginReturnUrl } from "@/lib/paymentRedirect";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIER_LABEL = { free: "Free", pro: "Pro", pro_plus: "Pro+", inhouse: "In-House" } as const;

export function AiUsageSettingsSection() {
  const { tier, isPro, isActive, subscription, isLoading: subLoading } = useSubscription();
  const {
    included_used,
    included_limit,
    included_remaining,
    purchased_balance,
    daily_remaining,
    daily_limit,
    daily_eligible,
    daily_resets_at,
    total_remaining,
    period_end,
    period_type,
    free_trial_days_left,
    isLoading: usageLoading,
  } = useAiUsage();
  const portal = useServerFn(createPortalSession);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const isLoading = subLoading || usageLoading;
  const poolRemaining = poolRemainingFromSummary({ included_remaining, purchased_balance });
  const poolCapacity = Math.max(included_limit, poolRemaining, 0);
  const barCapacity = creditAiTotalCapacity({
    dailyRemaining: daily_remaining,
    dailyLimit: daily_limit,
    poolRemaining,
    poolCapacity,
  });
  const resetsAt = formatAiPeriodEnd(period_end);
  const dailyResetsAt = formatDailyResetAt(daily_resets_at);
  const planHint = describeAiCreditsPlan({
    tier,
    period_type,
    included_limit,
    daily_limit,
    daily_eligible,
    free_trial_days_left,
  });
  const isFree = tier === "free";
  const creditsEnded =
    (period_type === "free_starter_ended" || period_type === "free_daily_ended") && isFree;
  const packLabel =
    period_type === "free_starter" ? "แพ็กเริ่มต้น" : isFree ? "โควต้าแพ็ก" : "โควต้าแพ็ก";

  async function openPortal() {
    setBusy(true);
    try {
      const res = await portal({
        data: { environment: getStripeEnvironment(), returnUrl: currentOriginReturnUrl() },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปิดหน้าจัดการไม่ได้");
    } finally {
      setBusy(false);
    }
  }

  const renewsAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card className="border-border/60 overflow-hidden h-full">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="p-0">
          <div className="p-5 space-y-3">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-start justify-between gap-3 text-left group"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    Credit AI
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {open ? planHint : `เหลือ ${total_remaining.toLocaleString("th-TH")} เครดิต`}
                  </p>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0",
                      isPro && "bg-primary/15 text-primary border-primary/20",
                    )}
                  >
                    {isPro ? <Crown className="h-3 w-3 mr-1" /> : null}
                    {TIER_LABEL[tier]}
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>

            <div className="space-y-1.5">
              <CreditAiBar
                dailyRemaining={daily_remaining}
                dailyLimit={daily_limit}
                poolRemaining={poolRemaining}
                poolCapacity={poolCapacity}
                isLoading={isLoading}
              />
              {!open && !isLoading && (
                <div className="flex items-center justify-between text-[11px] tabular-nums gap-2">
                  <span
                    className={cn(
                      total_remaining < 10
                        ? "text-destructive font-medium"
                        : total_remaining < 20
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-muted-foreground",
                    )}
                  >
                    เหลือ {total_remaining.toLocaleString("th-TH")} /{" "}
                    {barCapacity.toLocaleString("th-TH")} เครดิต
                  </span>
                  <span className="text-muted-foreground text-right shrink-0">
                    {daily_eligible && dailyResetsAt
                      ? `Daily รีเซ็ต ${dailyResetsAt}`
                      : resetsAt && !isFree
                        ? `รีเซ็ต ${resetsAt}`
                        : null}
                  </span>
                </div>
              )}
            </div>
          </div>

          <CollapsibleContent>
            <div className="px-5 pb-4 space-y-3 border-t border-border/40 pt-4">
              {creditsEnded && (
                <p className="text-xs text-destructive">
                  เครดิตหมดแล้ว — อัพเกรดหรือเติมเพื่อใช้ต่อ
                </p>
              )}

              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 space-y-2 text-xs">
                {daily_eligible && daily_limit > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                      Credit AI วันนี้
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      เหลือ {daily_remaining.toLocaleString("th-TH")} /{" "}
                      {daily_limit.toLocaleString("th-TH")}
                    </span>
                  </div>
                )}
                {(included_limit > 0 || included_used > 0) && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{packLabel}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {included_used.toLocaleString("th-TH")} /{" "}
                      {included_limit.toLocaleString("th-TH")}
                    </span>
                  </div>
                )}
                {purchased_balance > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      เติมเพิ่ม
                    </span>
                    <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                      {purchased_balance.toLocaleString("th-TH")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
                  <span className="font-medium">รวมใช้ได้</span>
                  <span className="tabular-nums font-bold text-primary">
                    {total_remaining.toLocaleString("th-TH")} เครดิต
                  </span>
                </div>
                {daily_eligible && dailyResetsAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Daily รีเซ็ต {dailyResetsAt} (ไม่ทบวันก่อน)
                  </p>
                )}
                {resetsAt && !isFree && (
                  <p className="text-[11px] text-muted-foreground">แพ็กรีเซ็ต {resetsAt}</p>
                )}
                {period_type === "free_daily_trial" && free_trial_days_left != null && (
                  <p className="text-[11px] text-muted-foreground">
                    ทดลอง Credit AI ฟรีเหลืออีก {free_trial_days_left} วัน
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border/60 bg-muted/20 px-5 py-4 space-y-3">
              {isPro && isActive && renewsAt && (
                <p className="text-[11px] text-muted-foreground">
                  {subscription?.cancel_at_period_end
                    ? `สิ้นสุด ${renewsAt}`
                    : `ต่ออายุ ${renewsAt}`}
                  {subscription?.status === "past_due" && (
                    <span className="text-destructive block mt-1">ชำระไม่สำเร็จ — อัปเดตบัตร</span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5 border-amber-500/30">
                  <Link to="/pricing">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    เติมเครดิต
                  </Link>
                </Button>
                {!isPro ? (
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/pricing">
                      <Sparkles className="h-3.5 w-3.5" />
                      อัพเกรด Pro
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openPortal}
                    disabled={busy}
                    className="gap-1.5"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    จัดการชำระเงิน
                  </Button>
                )}
                {!isPro && (
                  <p className="w-full text-[10px] text-muted-foreground">
                    Pro ปลดล็อก So1o My Desk +{" "}
                    <a
                      href={aplus1ShowcaseUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Aplus1
                    </a>
                  </p>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
