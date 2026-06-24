import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpCircle, Crown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/auth/AuthProvider";
import { pickLocale } from "@/lib/lineNotificationKinds";
import {
  allowedUpgradeTargets,
  isPaidTier,
  isPaymentFnError,
  isStripeManagedSubscription,
  tierLabel,
  type UpgradeTargetTier,
} from "@/lib/subscriptionTiers";
import { getStripeEnvironment } from "@/lib/stripe";
import { upgradeSubscriptionTier } from "@/utils/payments.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SubscriptionUpgradeBlock({
  embedded,
  className,
}: {
  embedded?: boolean;
  className?: string;
}) {
  const { profile } = useAuth();
  const locale = pickLocale(profile?.locale);
  const { tier, subscription, isPro, isActive, isLoading, refetch } = useSubscription();
  const env = getStripeEnvironment();
  const upgradeFn = useServerFn(upgradeSubscriptionTier);

  const [busy, setBusy] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<UpgradeTargetTier | null>(null);

  const paidTier = isPaidTier(tier) ? tier : null;
  const upgradeTargets = paidTier ? allowedUpgradeTargets(paidTier) : [];
  const stripeManaged =
    !!subscription?.stripe_subscription_id &&
    isStripeManagedSubscription(subscription.stripe_subscription_id);

  if (!isPro || !isActive || !paidTier || upgradeTargets.length === 0) return null;

  async function runUpgrade() {
    if (!confirmTarget) return;
    setBusy(true);
    const fallbackError = locale === "en" ? "Upgrade failed" : "อัปเกรดไม่สำเร็จ";
    try {
      const res = await upgradeFn({
        data: {
          environment: env,
          targetTier: confirmTarget,
          quantity: confirmTarget === "inhouse" ? 3 : undefined,
        },
      });
      if (isPaymentFnError(res)) throw new Error(res.error);
      if (!res || typeof res !== "object" || !("ok" in res)) {
        throw new Error(fallbackError);
      }
      toast.success(
        locale === "en"
          ? `Upgraded to ${tierLabel(confirmTarget)}`
          : `อัปเกรดเป็น ${tierLabel(confirmTarget)} แล้ว`,
      );
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : fallbackError);
    } finally {
      setBusy(false);
      setConfirmTarget(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          embedded ? "space-y-2" : "border-t border-border/40 pt-3 space-y-2",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">
              {locale === "en" ? "Upgrade plan" : "อัปเกรดแพ็กเกจ"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isLoading ? (
                locale === "en" ? (
                  "Loading…"
                ) : (
                  "กำลังโหลด…"
                )
              ) : (
                <>
                  <Crown className="inline h-3 w-3 mr-0.5 text-primary" />
                  {tierLabel(paidTier)}
                </>
              )}
            </p>
          </div>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>

        {!stripeManaged && (
          <p className="text-[11px] text-muted-foreground">
            {locale === "en"
              ? "This plan is admin-managed. Contact support to change tiers."
              : "แพ็กนี้จัดการโดยแอดมิน — ติดต่อทีมเพื่อเปลี่ยนแพ็ก"}
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          {stripeManaged &&
            upgradeTargets.map((target) =>
              target === "inhouse" ? (
                <Button
                  key={target}
                  asChild
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                >
                  <Link to="/pricing">
                    <Sparkles className="h-3 w-3" />
                    {locale === "en" ? "Upgrade to In-House" : "อัปเกรด In-House"}
                  </Link>
                </Button>
              ) : (
                <Button
                  key={target}
                  type="button"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  disabled={busy || isLoading}
                  onClick={() => setConfirmTarget(target)}
                >
                  <Sparkles className="h-3 w-3" />
                  {locale === "en"
                    ? `Upgrade to ${tierLabel(target)}`
                    : `อัปเกรด ${tierLabel(target)}`}
                </Button>
              ),
            )}
        </div>
      </div>

      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && !busy && setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale === "en"
                ? `Upgrade to ${confirmTarget ? tierLabel(confirmTarget) : ""}?`
                : `อัปเกรดเป็น ${confirmTarget ? tierLabel(confirmTarget) : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "en"
                ? "Stripe will charge the prorated difference for the rest of this billing period. Your plan updates immediately."
                : "Stripe จะคิดเงินส่วนต่างตามสัดส่วนที่เหลือในรอบบิลนี้ แพ็กจะเปลี่ยนทันที"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {locale === "en" ? "Back" : "ยกเลิก"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void runUpgrade();
              }}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : locale === "en" ? (
                "Confirm upgrade"
              ) : (
                "ยืนยันอัปเกรด"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
