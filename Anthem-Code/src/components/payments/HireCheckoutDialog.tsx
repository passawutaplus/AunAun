import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import HireCheckoutSummary from "@/components/payments/HireCheckoutSummary";
import { useSendMessage } from "@/hooks/useChat";
import {
  formatOfferAmount,
  offerWhtAmount,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import { DEFAULT_PAYMENT_FEATURE_FLAGS } from "@/lib/payments/flags";
import {
  DEFAULT_FEE_CONFIG,
  planInstallmentSatang,
  snapshotFees,
  thbToSatang,
} from "@/lib/payments/fees";
import { buildCheckoutDisplay } from "@/lib/payments/fxDisplay";
import type { PaymentMethod } from "@/lib/payments/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: ChatOfferPayload;
  conversationId: string;
  hiringRequestId?: string | null;
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  promptpay: "พร้อมเพย์",
  card: "บัตรเครdit/เดbit",
  bank_transfer: "โอนธนาคาร",
};

/** Buyer checkout for an accepted in-chat hire quote. Omise charge is stubbed until API is wired. */
export default function HireCheckoutDialog({
  open,
  onOpenChange,
  offer,
  conversationId,
}: Props) {
  const send = useSendMessage();
  const [method, setMethod] = useState<PaymentMethod>("promptpay");
  const [paying, setPaying] = useState(false);

  const checkout = useMemo(() => {
    const jobPriceSatang = thbToSatang(offer.amount || 0);
    const whtOn = offer.whtEnabled !== false;
    const whtRate = offer.whtRate ?? 3;
    const whtSatang = whtOn ? thbToSatang(offerWhtAmount(offer.amount || 0, whtRate)) : 0;
    const depositPct = Math.min(100, Math.max(1, Math.round(offer.depositPercent ?? 100)));
    const installment = planInstallmentSatang(jobPriceSatang, depositPct, whtSatang);
    const chargePercent = depositPct < 100 ? depositPct : 100;
    const money = snapshotFees(jobPriceSatang, method, DEFAULT_FEE_CONFIG, {
      whtSatang,
      chargePercent,
    });
    const display = buildCheckoutDisplay({
      buyerPaysSatang: money.buyerPaysSatang,
      displayCurrency: offer.displayCurrency ?? "THB",
      fx:
        offer.fxRateSnapshot && offer.displayCurrency === "USD"
          ? {
              quoteCurrency: "USD",
              rate: offer.fxRateSnapshot.rate,
              source: offer.fxRateSnapshot.source,
              asOf: offer.fxRateSnapshot.asOf,
            }
          : null,
    });
    return { money, installment, depositPct, display };
  }, [offer, method]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const methodLabel = METHOD_LABELS[method];
      const amountLabel = formatOfferAmount(checkout.money.buyerPaysSatang / 100);

      // Server-side Omise only (omiseProvider.ts) — no client charge API yet.
      const omiseReady =
        DEFAULT_PAYMENT_FEATURE_FLAGS.omisePaymentsEnabled &&
        (method !== "promptpay" || DEFAULT_PAYMENT_FEATURE_FLAGS.omisePromptPayEnabled) &&
        (method !== "card" || DEFAULT_PAYMENT_FEATURE_FLAGS.omiseCardEnabled) &&
        (method !== "bank_transfer" || DEFAULT_PAYMENT_FEATURE_FLAGS.bankTransferEnabled);

      if (omiseReady) {
        toast.info("รอเชื่อม Omise — บันทึกคำขอชำระแล้ว");
      } else {
        toast.success("บันทึกคำขอชำระแล้ว — รอเชื่อม Omise");
      }

      await send.mutateAsync({
        conversationId,
        content: omiseReady
          ? `กำลังเตรียมชำระเงิน ${amountLabel} ผ่าน ${methodLabel} — Aplus1 เป็นตัวกลาง`
          : `กำลังเตรียมชำระเงิน ${amountLabel} ผ่าน ${methodLabel} (รอเชื่อม Omise) — Aplus1 เป็นตัวกลาง`,
        messageType: "system",
      });

      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ชำระเงินไม่สำเร็จ");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ชำระเงินจ้างงาน</DialogTitle>
          <DialogDescription>
            {offer.title}
            {offer.number ? ` · ${offer.number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aplus1 เป็นตัวกลาง — รับชำระจากผู้จ้างและโอนให้ผู้รับงานหลังอนุมัติงานตามเงื่อนไขแพลตฟอร์ม
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="hire-pay-method">วิธีชำระเงิน</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
              disabled={paying}
            >
              <SelectTrigger id="hire-pay-method" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promptpay">พร้อมเพย์</SelectItem>
                <SelectItem value="card">บัตรเครdit/เดbit</SelectItem>
                <SelectItem value="bank_transfer">โอนธนาคาร</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {checkout.depositPct < 100 ? (
            <p className="text-xs text-muted-foreground">
              รอบนี้ชำระมัดจำ {checkout.depositPct}% · คงเหลือ{" "}
              {formatOfferAmount(checkout.installment.balanceSatang / 100)} หลังเริ่มงาน
            </p>
          ) : null}

          <HireCheckoutSummary
            jobPriceSatang={checkout.money.jobPriceSatang}
            buyerPaysSatang={checkout.money.buyerPaysSatang}
            platformFeePercent={checkout.money.fee.platformFeePercent}
            cardSurchargeSatang={checkout.money.fee.cardSurchargeSatang}
            methodLabel={METHOD_LABELS[method]}
            quoteLabel={checkout.display.quoteLabel ?? null}
            className="rounded-xl border border-border/60 bg-muted/20 p-3"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={paying}
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={paying || send.isPending}
            onClick={() => void handlePay()}
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            ชำระเงิน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
