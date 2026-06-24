import * as React from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { syncSubscriptionFromStripe } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { isPaymentFnError } from "@/lib/subscriptionTiers";

/**
 * After Stripe redirect (?upgrade=success or ?topup=success), sync from Stripe
 * when webhooks haven't propagated yet, then poll until tier/credits update.
 */
export function CheckoutSuccessHandler() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, string | undefined>;
  const { tier, credits, refetch } = useSubscription();
  const syncFromStripe = useServerFn(syncSubscriptionFromStripe);
  const handled = React.useRef(false);

  React.useEffect(() => {
    if (handled.current) return;
    const isUpgrade = search.upgrade === "success";
    const isTopup = search.topup === "success";
    if (!isUpgrade && !isTopup) return;
    handled.current = true;

    const id = toast.loading(isUpgrade ? "กำลังเปิดใช้งานแพ็กเกจ Pro…" : "กำลังเติมเครดิต…");

    let attempts = 0;
    const initialTier = tier;
    const initialCredits = credits;
    let interval: ReturnType<typeof setInterval> | null = null;

    const finish = (message: { type: "success" | "info"; text: string }) => {
      if (interval) clearInterval(interval);
      toast.dismiss(id);
      if (message.type === "success") toast.success(message.text);
      else toast.info(message.text);
      const { upgrade, topup, ...rest } = search;
      navigate({ to: "/dashboard", search: rest as any, replace: true });
    };

    const startPolling = () => {
      interval = setInterval(async () => {
        attempts++;
        const res = await refetch();
        const newTier = res.data?.profileTier ?? "free";
        const newCredits = res.data?.credits ?? 0;

        const upgraded = isUpgrade && newTier !== "free" && newTier !== initialTier;
        const topped = isTopup && newCredits > initialCredits;

        if (upgraded) {
          finish({ type: "success", text: "🎉 อัปเกรดสำเร็จ! ยินดีต้อนรับสู่ Pro" });
        } else if (topped) {
          finish({
            type: "success",
            text: `⚡ เติมเครดิตสำเร็จ +${newCredits - initialCredits}`,
          });
        } else if (attempts >= 12) {
          finish({
            type: "info",
            text: "ระบบกำลังประมวลผล — รีเฟรชหน้าอีกครั้งภายใน 1 นาที",
          });
        }
      }, 2500);
    };

    void (async () => {
      if (isUpgrade) {
        try {
          const result = await syncFromStripe({
            data: { environment: getStripeEnvironment() },
          });
          if (isPaymentFnError(result)) {
            console.warn("[checkout-success] sync failed:", result.error);
          } else if ("synced" in result && result.synced) {
            const res = await refetch();
            const newTier = res.data?.profileTier ?? "free";
            if (newTier !== "free" && newTier !== initialTier) {
              finish({ type: "success", text: "🎉 อัปเกรดสำเร็จ! ยินดีต้อนรับสู่ Pro" });
              return;
            }
          }
        } catch (err) {
          console.warn("[checkout-success] sync error:", err);
        }
      }
      startPolling();
    })();

    return () => {
      if (interval) clearInterval(interval);
      toast.dismiss(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
