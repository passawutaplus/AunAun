import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownCircle, Crown, Loader2 } from "lucide-react";
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
import { pickLocale, type UserLocale } from "@/lib/lineNotificationKinds";
import {
  allowedDowngradeTargets,
  isPaidTier,
  isPaymentFnError,
  tierLabel,
  type DowngradeTargetTier,
  type PendingTierChange,
} from "@/lib/subscriptionTiers";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  getSubscriptionDowngradeState,
  resumeSubscription,
  scheduleSubscriptionCancel,
  scheduleSubscriptionTierDowngrade,
} from "@/utils/payments.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ConfirmAction =
  | { kind: "cancel-free" }
  | { kind: "tier"; targetTier: DowngradeTargetTier }
  | { kind: "resume" };

function formatDate(iso: string | null | undefined, locale: UserLocale): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function paymentFnError(res: unknown, fallback: string): string {
  if (isPaymentFnError(res)) return res.error;
  return fallback;
}

export function SubscriptionDowngradeBlock({
  embedded,
  className,
}: {
  embedded?: boolean;
  className?: string;
}) {
  const { profile } = useAuth();
  const locale = pickLocale(profile?.locale);
  const { tier, subscription, isPro, isActive, isLoading: subLoading, refetch } = useSubscription();
  const env = getStripeEnvironment();

  const loadState = useServerFn(getSubscriptionDowngradeState);
  const cancelFn = useServerFn(scheduleSubscriptionCancel);
  const resumeFn = useServerFn(resumeSubscription);
  const tierFn = useServerFn(scheduleSubscriptionTierDowngrade);

  const [pendingTierChange, setPendingTierChange] = React.useState<PendingTierChange | null>(null);
  const [loadingState, setLoadingState] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmAction | null>(null);

  const paidTier = isPaidTier(tier) ? tier : null;
  const cancelAtPeriodEnd = subscription?.cancel_at_period_end ?? false;
  const periodEnd = subscription?.current_period_end ?? null;
  const periodLabel = formatDate(periodEnd, locale);
  const downgradeTargets = paidTier ? allowedDowngradeTargets(paidTier) : [];

  const refreshPendingChange = React.useCallback(async () => {
    if (!paidTier) {
      setPendingTierChange(null);
      return;
    }
    setLoadingState(true);
    try {
      const res = await loadState({ data: { environment: env } });
      if (isPaymentFnError(res)) {
        setPendingTierChange(null);
        return;
      }
      setPendingTierChange(res.pendingTierChange);
    } catch {
      setPendingTierChange(null);
    } finally {
      setLoadingState(false);
    }
  }, [env, loadState, paidTier]);

  React.useEffect(() => {
    if (isPro && isActive) void refreshPendingChange();
  }, [isPro, isActive, refreshPendingChange]);

  if (!isPro || !isActive || !paidTier) return null;

  async function runConfirmAction() {
    if (!confirm) return;
    setBusy(true);
    const fallbackError = locale === "en" ? "Action failed" : "ดำเนินการไม่สำเร็จ";
    try {
      if (confirm.kind === "cancel-free") {
        const res = await cancelFn({ data: { environment: env } });
        if (isPaymentFnError(res)) throw new Error(res.error);
        if (!res || typeof res !== "object" || !("ok" in res)) {
          throw new Error(paymentFnError(res, fallbackError));
        }
        toast.success(
          locale === "en"
            ? "Subscription will end at period end"
            : "กำหนดยกเลิกเมื่อสิ้นรอบบิลแล้ว",
        );
      } else if (confirm.kind === "tier") {
        const res = await tierFn({
          data: { environment: env, targetTier: confirm.targetTier },
        });
        if (isPaymentFnError(res)) throw new Error(res.error);
        if (!res || typeof res !== "object" || !("ok" in res)) {
          throw new Error(paymentFnError(res, fallbackError));
        }
        toast.success(
          locale === "en"
            ? `Plan change scheduled for ${formatDate(res.effectiveAt ?? periodEnd, locale)}`
            : `กำหนดเปลี่ยนแพ็กวันที่ ${formatDate(res.effectiveAt ?? periodEnd, locale)}`,
        );
      } else {
        const res = await resumeFn({ data: { environment: env } });
        if (isPaymentFnError(res)) throw new Error(res.error);
        if (!res || typeof res !== "object" || !("ok" in res)) {
          throw new Error(paymentFnError(res, fallbackError));
        }
        toast.success(
          locale === "en"
            ? "Downgrade canceled — subscription continues"
            : "ยกเลิกการ downgrade แล้ว",
        );
      }
      await refetch();
      await refreshPendingChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : fallbackError);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const confirmCopy = (() => {
    if (!confirm) return { title: "", description: "" };
    if (confirm.kind === "cancel-free") {
      return {
        title: locale === "en" ? "Downgrade to Free?" : "กลับ Free?",
        description:
          locale === "en"
            ? `Your paid features stay active until ${periodLabel}. After that, your account returns to Free.`
            : `สิทธิ์แพ็กปัจจุบันยังใช้ได้จนถึง ${periodLabel} จากนั้นบัญชีจะกลับเป็น Free`,
      };
    }
    if (confirm.kind === "tier") {
      const target = tierLabel(confirm.targetTier);
      return {
        title: locale === "en" ? `Downgrade to ${target}?` : `ลดเป็น ${target}?`,
        description:
          locale === "en"
            ? `Your current plan stays active until ${periodLabel}, then switches to ${target}.`
            : `แพ็กปัจจุบันยังใช้ได้จนถึง ${periodLabel} จากนั้นจะเปลี่ยนเป็น ${target}`,
      };
    }
    return {
      title: locale === "en" ? "Cancel downgrade?" : "ยกเลิกการ downgrade?",
      description:
        locale === "en"
          ? "Your subscription will continue renewing at the current plan."
          : "การสมัครสมาชิกจะต่ออายุตามแพ็กปัจจุบันต่อไป",
    };
  })();

  const showTierButtons = !cancelAtPeriodEnd && !pendingTierChange && downgradeTargets.length > 0;

  const showCancelFree = !cancelAtPeriodEnd && !pendingTierChange;

  const showResume = cancelAtPeriodEnd || !!pendingTierChange;

  return (
    <>
      <div
        className={cn(
          embedded ? "space-y-2" : "border-t border-border/40 pt-3 space-y-2",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">
              {locale === "en" ? "Plan downgrade" : "ปรับลดแพ็กเกจ"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {subLoading || loadingState ? (
                locale === "en" ? (
                  "Loading…"
                ) : (
                  "กำลังโหลด…"
                )
              ) : (
                <>
                  <Crown className="inline h-3 w-3 mr-0.5 text-primary" />
                  {tierLabel(paidTier)}
                  {periodEnd && !cancelAtPeriodEnd && !pendingTierChange
                    ? locale === "en"
                      ? ` · renews ${periodLabel}`
                      : ` · ต่ออายุ ${periodLabel}`
                    : null}
                </>
              )}
            </p>
          </div>
          {(subLoading || loadingState) && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>

        {cancelAtPeriodEnd && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            {locale === "en"
              ? `Ends on ${periodLabel} (no auto-renew)`
              : `สิ้นสุดวันที่ ${periodLabel} (ไม่ต่ออายุอัตโนมัติ)`}
          </p>
        )}

        {pendingTierChange && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            {locale === "en"
              ? `Changing to ${tierLabel(pendingTierChange.targetTier)} on ${formatDate(pendingTierChange.effectiveAt, locale)}`
              : `จะเปลี่ยนเป็น ${tierLabel(pendingTierChange.targetTier)} วันที่ ${formatDate(pendingTierChange.effectiveAt, locale)}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          {showTierButtons &&
            downgradeTargets.map((target) => (
              <Button
                key={target}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={busy || loadingState}
                onClick={() => setConfirm({ kind: "tier", targetTier: target })}
              >
                {locale === "en"
                  ? `Downgrade to ${tierLabel(target)}`
                  : `ลดเป็น ${tierLabel(target)}`}
              </Button>
            ))}

          {showCancelFree && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-destructive hover:text-destructive"
              disabled={busy || loadingState}
              onClick={() => setConfirm({ kind: "cancel-free" })}
            >
              {locale === "en" ? "Downgrade to Free" : "กลับ Free"}
            </Button>
          )}

          {showResume && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              disabled={busy || loadingState}
              onClick={() => setConfirm({ kind: "resume" })}
            >
              {locale === "en" ? "Cancel downgrade" : "ยกเลิกการ downgrade"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {locale === "en" ? "Back" : "ยกเลิก"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={
                confirm?.kind === "resume"
                  ? undefined
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
              onClick={(e) => {
                e.preventDefault();
                void runConfirmAction();
              }}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirm?.kind === "resume" ? (
                locale === "en" ? (
                  "Confirm"
                ) : (
                  "ยืนยัน"
                )
              ) : locale === "en" ? (
                "Confirm downgrade"
              ) : (
                "ยืนยัน downgrade"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
