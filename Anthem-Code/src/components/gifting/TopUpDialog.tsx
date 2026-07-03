import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Zap, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { PX_PRICE_BY_AMOUNT, startStripeCheckout } from "@/lib/stripePaymentsApi";
import { PIXEL_POLICY_PATH } from "@/lib/pixelPolicy";
import DailyPxClaimCard from "./DailyPxClaimCard";
import WalletBalanceSummary from "./WalletBalanceSummary";
import WalletEarnMoreSection from "./WalletEarnMoreSection";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const PRESETS = [
  { px: 500, label: "Starter" },
  { px: 2000, label: "Creator" },
  { px: 10000, label: "Studio" },
] as const;

const TopUpDialog = ({ open, onOpenChange }: Props) => {
  const { data: wallet } = useWallet();
  const [loadingPx, setLoadingPx] = useState<number | null>(null);

  const handleStripeTopup = async (px: number) => {
    const priceId = PX_PRICE_BY_AMOUNT[px];
    if (!priceId) {
      toast.error("แพ็กนี้ยังไม่พร้อม — เลือก 500 / 2,000 / 10,000 px");
      return;
    }
    setLoadingPx(px);
    try {
      await startStripeCheckout({
        priceId,
        successPath: "/earnings?topup=success",
        cancelPath: "/earnings?topup=canceled",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ไม่สามารถเริ่ม checkout ได้");
      setLoadingPx(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[min(90vh,640px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> เติม Pixel
          </DialogTitle>
          <DialogDescription>
            ยอดปัจจุบัน{" "}
            <span className="text-primary font-semibold tabular-nums">
              {(wallet?.balance_px ?? 0).toLocaleString()} px
            </span>{" "}
            · 1 px = 1 บาท
          </DialogDescription>
        </DialogHeader>

        <DailyPxClaimCard />

        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map(({ px, label }) => {
            const active = loadingPx === px;
            return (
              <button
                key={px}
                type="button"
                onClick={() => handleStripeTopup(px)}
                disabled={loadingPx !== null}
                className="rounded-xl border border-border hover:border-primary/40 p-3 text-left transition flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {px.toLocaleString()} <span className="text-xs text-muted-foreground">px</span>
                  </p>
                  <p className="text-xs text-muted-foreground">฿ {px.toLocaleString()}</p>
                </div>
                {active ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <WalletBalanceSummary />

        <WalletEarnMoreSection onClose={() => onOpenChange(false)} />

        <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed space-y-1.5">
          <p>
            ยอดที่เติมใช้<span className="font-medium text-foreground">ส่งของขวัญได้ทันที</span>
            หลังชำระสำเร็จ (ถอนเป็นเงินไม่ได้)
          </p>
          <p>ชำระผ่าน Stripe Checkout · ดูรายละเอียดที่{" "}
            <Link
              to={PIXEL_POLICY_PATH}
              className="text-primary font-medium underline underline-offset-2"
              onClick={() => onOpenChange(false)}
            >
              นโยบาย Pixel
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDialog;
