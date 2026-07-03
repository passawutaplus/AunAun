import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  PX_CUSTOM_MAX,
  PX_CUSTOM_MIN,
  PX_CUSTOM_PRICE_ID,
  PX_PRICE_BY_AMOUNT,
  startStripeCheckout,
} from "@/lib/stripePaymentsApi";
import DailyPxClaimCard from "./DailyPxClaimCard";
import WalletBalanceSummary from "./WalletBalanceSummary";
import WalletEarnMoreSection from "./WalletEarnMoreSection";
import { ReferralInviteCard } from "@/components/referral/ReferralInviteCard";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 5000, 10000] as const;

function parseCustomPxInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

const TopUpDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [customPxInput, setCustomPxInput] = useState("");

  useEffect(() => {
    if (!open || !user?.id) return;
    void qc.invalidateQueries({ queryKey: ["wallet", user.id] });
    void qc.invalidateQueries({ queryKey: ["daily-px-status", user.id] });
    void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user.id] });
    void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user.id] });
  }, [open, user?.id, qc]);

  const customPx = parseCustomPxInput(customPxInput);
  const customPxValid =
    customPx != null && customPx >= PX_CUSTOM_MIN && customPx <= PX_CUSTOM_MAX;

  const handleQuickTopup = async (px: number) => {
    const presetPriceId = PX_PRICE_BY_AMOUNT[px];
    setLoadingKey(String(px));
    try {
      await startStripeCheckout(
        presetPriceId
          ? {
              priceId: presetPriceId,
              successPath: "/earnings?topup=success",
              cancelPath: "/earnings?topup=canceled",
            }
          : {
              priceId: PX_CUSTOM_PRICE_ID,
              amountPx: px,
              successPath: "/earnings?topup=success",
              cancelPath: "/earnings?topup=canceled",
            },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ไม่สามารถเริ่ม checkout ได้");
      setLoadingKey(null);
    }
  };

  const handleCustomTopup = async () => {
    if (!customPxValid || customPx == null) {
      toast.error(`กรอกจำนวน ${PX_CUSTOM_MIN.toLocaleString()}–${PX_CUSTOM_MAX.toLocaleString()} px`);
      return;
    }
    setLoadingKey("custom");
    try {
      await startStripeCheckout({
        priceId: PX_CUSTOM_PRICE_ID,
        amountPx: customPx,
        successPath: "/earnings?topup=success",
        cancelPath: "/earnings?topup=canceled",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ไม่สามารถเริ่ม checkout ได้");
      setLoadingKey(null);
    }
  };

  const checkoutBusy = loadingKey !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[min(90vh,640px)] overflow-y-auto">
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> เติม Pixel
            </DialogTitle>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-full text-xs shrink-0 border-primary/30 hover:bg-primary/10"
            >
              <Link to="/earnings" onClick={() => onOpenChange(false)}>
                <Wallet className="w-3.5 h-3.5 mr-1" />
                กระเป๋า
              </Link>
            </Button>
          </div>
        </DialogHeader>

        <WalletBalanceSummary refreshWhenOpen={open} />

        <DailyPxClaimCard enabled={open} />

        <section className="rounded-xl border border-border p-3 space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">กำหนดจำนวนเอง</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {PX_CUSTOM_MIN.toLocaleString()}–{PX_CUSTOM_MAX.toLocaleString()} px · 1 px = ฿1
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={`เช่น ${PX_CUSTOM_MIN}`}
                value={customPxInput}
                disabled={checkoutBusy}
                onChange={(e) => setCustomPxInput(e.target.value.replace(/[^\d]/g, ""))}
                className="h-10 rounded-xl pr-10 tabular-nums"
                aria-label="จำนวน px ที่ต้องการเติม"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                px
              </span>
            </div>
            <Button
              type="button"
              className="h-10 rounded-xl shrink-0 px-4"
              disabled={checkoutBusy || !customPxValid}
              onClick={handleCustomTopup}
            >
              {loadingKey === "custom" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "เติม"
              )}
            </Button>
          </div>
          {customPx != null && customPx > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {customPxValid ? (
                <>
                  ชำระ{" "}
                  <span className="font-medium text-foreground">฿ {customPx.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-destructive">
                  ต้องอยู่ระหว่าง {PX_CUSTOM_MIN.toLocaleString()}–{PX_CUSTOM_MAX.toLocaleString()} px
                </span>
              )}
            </p>
          )}
        </section>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((px) => {
            const active = loadingKey === String(px);
            return (
              <button
                key={px}
                type="button"
                onClick={() => handleQuickTopup(px)}
                disabled={checkoutBusy}
                className="rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 py-2.5 text-sm font-medium tabular-nums transition disabled:opacity-50"
              >
                {active ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
                ) : (
                  px.toLocaleString()
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          อย่าลืมทำภารกิจด้านล่างเพื่อรับ px ฟรีด้วยนะ
        </p>

        <WalletEarnMoreSection onClose={() => onOpenChange(false)} hideReferral />

        <ReferralInviteCard onClose={() => onOpenChange(false)} enabled={open} />
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDialog;
