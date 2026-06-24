import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/utils/payments.functions";
import { currentOriginReturnUrl } from "@/lib/paymentRedirect";
import { getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Global banner shown in the dashboard when a subscription needs attention:
 * - past_due: payment failed, needs to update card
 * - cancel_at_period_end: scheduled to end
 */
export function SubscriptionStatusBanner() {
  const { subscription } = useSubscription();
  const [dismissed, setDismissed] = React.useState(false);
  const portal = useServerFn(createPortalSession);
  const [loading, setLoading] = React.useState(false);

  const status = subscription?.status;
  const cancelEnd = subscription?.cancel_at_period_end;
  const endsAt = subscription?.current_period_end;

  const show =
    !dismissed && !!subscription && (status === "past_due" || (status === "active" && cancelEnd));

  const handleOpen = async () => {
    setLoading(true);
    try {
      const res = await portal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: currentOriginReturnUrl(),
        },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "เปิดหน้าจัดการไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const isPastDue = status === "past_due";
  const fmtDate = endsAt
    ? new Date(endsAt).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div
      className={`relative w-full border-b px-4 py-2.5 text-sm flex items-center gap-3 ${
        isPastDue
          ? "bg-destructive/10 border-destructive/30 text-destructive-foreground"
          : "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900"
      }`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {isPastDue ? (
          <>การชำระเงินรอบล่าสุดไม่สำเร็จ — กรุณาอัปเดตวิธีชำระเงินก่อนถูกระงับการใช้งาน</>
        ) : (
          <>
            การสมัครสมาชิกของคุณจะสิ้นสุดวันที่ <strong>{fmtDate}</strong> — กดสมัครต่อได้ทุกเมื่อ
          </>
        )}
      </span>
      <Button
        size="sm"
        variant={isPastDue ? "destructive" : "secondary"}
        onClick={handleOpen}
        disabled={loading}
        className="h-7"
      >
        {isPastDue ? "อัปเดตบัตร" : "จัดการ"}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="ปิดการแจ้งเตือน"
        className="rounded-full p-1 hover:bg-foreground/5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
