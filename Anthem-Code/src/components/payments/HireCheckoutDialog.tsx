import { useMemo, useState } from "react";
import {
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
} from "lucide-react";
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
import HireCheckoutSummary from "@/components/payments/HireCheckoutSummary";
import HirePromptPayView from "@/components/payments/HirePromptPayView";
import HirePaySuccessView from "@/components/payments/HirePaySuccessView";
import { useSendMessage } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useHireCharge, type HireChargeResult } from "@/hooks/useHireCharge";
import {
  formatOfferAmount,
  offerWhtAmount,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import { encodeHirePaidMessage } from "@/lib/hirePaymentChat";
import {
  buildHireWorkStartPayload,
  encodeHireWorkStartMessage,
} from "@/lib/hireWorkStartChat";
import {
  DEFAULT_FEE_CONFIG,
  planInstallmentSatang,
  satangToThb,
  snapshotFees,
  thbToSatang,
} from "@/lib/payments/fees";
import { createHireOrderAfterPayment } from "@/lib/payments/createHireOrderAfterPayment";
import { buildCheckoutDisplay } from "@/lib/payments/fxDisplay";
import type { PaymentMethod } from "@/lib/payments/types";
import { useMarkHireOfferAccepted } from "@/hooks/useHireCancelRequest";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: ChatOfferPayload;
  conversationId: string;
  hiringRequestId?: string | null;
};

type Step = "method" | "qr" | "success";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  promptpay: "พร้อมเพย์ (QR)",
  card: "บัตรเครดิต / เดบิต",
  bank_transfer: "โอนผ่านบัญชีธนาคาร",
};

const METHOD_OPTIONS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  badge?: string;
  icon: typeof QrCode;
}[] = [
  {
    id: "promptpay",
    label: "พร้อมเพย์ (QR)",
    hint: "สแกนจ่ายผ่านแอปธนาคาร ไม่มีค่าธรรมเนียม",
    badge: "แนะนำ",
    icon: QrCode,
  },
  {
    id: "card",
    label: "บัตรเครดิต / เดบิต",
    hint: "Visa · Mastercard · JCB (อาจมีค่าธรรมเนียมบัตร)",
    icon: CreditCard,
  },
  {
    id: "bank_transfer",
    label: "โอนผ่านบัญชีธนาคาร",
    hint: "โอนแล้วแนบสลิปเพื่อยืนยัน",
    icon: Landmark,
  },
];

/** Buyer checkout for an accepted in-chat hire quote (UI-first; Omise charge mocked when flags off). */
export default function HireCheckoutDialog({
  open,
  onOpenChange,
  offer,
  conversationId,
  hiringRequestId,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const markOfferAccepted = useMarkHireOfferAccepted();
  const send = useSendMessage();
  const { createCharge, pending } = useHireCharge();
  const [method, setMethod] = useState<PaymentMethod>("promptpay");
  const [step, setStep] = useState<Step>("method");
  const [charge, setCharge] = useState<HireChargeResult | null>(null);

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

  const resetAndClose = () => {
    onOpenChange(false);
    // Delay reset so closing animation doesn't flash the first step.
    setTimeout(() => {
      setStep("method");
      setCharge(null);
      setMethod("promptpay");
    }, 250);
  };

  const startCharge = async () => {
    try {
      const result = await createCharge({
        amountSatang: checkout.money.buyerPaysSatang,
        method,
        title: offer.title,
        quoteId: offer.quoteId ?? null,
        hiringRequestId: hiringRequestId ?? null,
        conversationId,
      });
      setCharge(result);
      setStep(method === "promptpay" ? "qr" : "success");
      if (method !== "promptpay" && !result.live) {
        await announcePaid(result);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เริ่มการชำระเงินไม่สำเร็จ");
    }
  };

  const announcePaid = async (result: HireChargeResult) => {
    if (hiringRequestId) {
      try {
        await markOfferAccepted.mutateAsync(hiringRequestId);
      } catch {
        /* chat card still useful if RLS/status race */
      }
    }

    let orderId: string | null = null;
    if (user?.id) {
      const persisted = await createHireOrderAfterPayment({
        offer,
        conversationId,
        hiringRequestId,
        method: result.method,
        paidAmountSatang: result.amountSatang,
        buyerId: user.id,
        chargeId: result.chargeId,
      });
      orderId = persisted?.orderId ?? null;
      if (!orderId) {
        console.warn("[HireCheckoutDialog] hire_orders persist failed after payment");
      }
      if (hiringRequestId) {
        void qc.invalidateQueries({ queryKey: ["hire-order-by-request", hiringRequestId] });
        void qc.invalidateQueries({ queryKey: ["hire-orders-by-request", hiringRequestId] });
        void qc.invalidateQueries({ queryKey: ["chat-hire-latest-quote", hiringRequestId] });
        void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", hiringRequestId] });
        void qc.invalidateQueries({ queryKey: ["chat-hire-meta", hiringRequestId] });
      }
      if (orderId) {
        void qc.invalidateQueries({ queryKey: ["hire-order-by-id", orderId] });
        void qc.invalidateQueries({ queryKey: ["hire-order-documents", orderId] });
      }
    }

    void qc.invalidateQueries({ queryKey: ["messages", user?.id, conversationId] });

    // Paid card, then work-start (timeline + items) — send separately so one failure
    // does not block the other.
    let paidPosted = false;
    try {
      await send.mutateAsync({
        conversationId,
        content: encodeHirePaidMessage({
          v: 1,
          kind: "hire_paid",
          offerTitle: offer.title,
          offerAmountThb: offer.amount || 0,
          paidAmountThb: satangToThb(result.amountSatang),
          quoteId: offer.quoteId ?? null,
          orderId,
        }),
        messageType: "system",
      });
      paidPosted = true;
    } catch (e) {
      console.warn("[HireCheckoutDialog] hire paid card failed", e);
    }
    try {
      await send.mutateAsync({
        conversationId,
        content: encodeHireWorkStartMessage(
          buildHireWorkStartPayload(offer, { orderId }),
        ),
        messageType: "system",
      });
    } catch (e) {
      console.warn("[HireCheckoutDialog] work-start card failed", e);
      /* ChatThreadView backfills work-start when hire is settled */
    }
    if (!paidPosted) {
      toast.message("ชำระเงินแล้ว — รีเฟรชแชทถ้ายังไม่เห็นการ์ดอัปเดต");
    }
  };

  const handleSimulatePaid = async () => {
    if (charge) await announcePaid(charge);
    setStep("success");
  };

  const buyerBaht = formatOfferAmount(satangToThb(checkout.money.buyerPaysSatang));

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "success"
              ? "ชำระเงินสำเร็จ"
              : step === "qr"
                ? "สแกนเพื่อชำระเงิน"
                : "ชำระเงินจ้างงาน"}
          </DialogTitle>
          <DialogDescription>
            {offer.title}
            {offer.number ? ` · ${offer.number}` : ""}
          </DialogDescription>
        </DialogHeader>

        {step === "method" ? (
          <>
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                ชำระเงินปลอดภัย 100% ผ่านตัวกลาง Aplus1
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Aplus1 เป็นตัวกลาง — รับชำระจากผู้จ้างและโอนให้ผู้รับงานหลังอนุมัติงานตามเงื่อนไขแพลตฟอร์ม
              </p>

              <div className="space-y-2">
                {METHOD_OPTIONS.map(({ id, label, hint, badge, icon: Icon }) => {
                  const active = method === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={pending}
                      onClick={() => setMethod(id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                          : "border-border hover:border-primary/40 hover:bg-secondary/40",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{label}</span>
                          {badge ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{hint}</span>
                      </span>
                      <span
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-full border-2",
                          active ? "border-primary bg-primary" : "border-muted-foreground/40",
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {checkout.depositPct < 100 ? (
                <p className="text-xs text-muted-foreground">
                  รอบนี้ชำระมัดจำ {checkout.depositPct}% · คงเหลือ{" "}
                  {formatOfferAmount(satangToThb(checkout.installment.balanceSatang))} หลังเริ่มงาน
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

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                ข้อมูลการชำระเงินถูกเข้ารหัสและประมวลผลผ่านผู้ให้บริการที่ได้รับมาตรฐาน
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={resetAndClose}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={pending || send.isPending}
                onClick={() => void startCharge()}
              >
                {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                ชำระเงิน ({buyerBaht})
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {step === "qr" && charge ? (
          <div className="py-1">
            <HirePromptPayView
              charge={charge}
              onSimulatePaid={() => void handleSimulatePaid()}
              onSwitchMethod={(m) => {
                setMethod(m);
                setCharge(null);
                setStep("method");
              }}
            />
          </div>
        ) : null}

        {step === "success" && charge ? (
          <HirePaySuccessView
            amountSatang={charge.amountSatang}
            reference={charge.reference}
            onDone={resetAndClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
