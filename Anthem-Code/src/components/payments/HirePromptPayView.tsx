import { useEffect, useState } from "react";
import { AlertTriangle, Copy, CreditCard, Landmark, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatOfferAmount } from "@/lib/chatOffer";
import { satangToThb } from "@/lib/payments/fees";
import { LEGAL_COMPANY_NAME } from "@/lib/legalConfig";
import type { HireChargeResult } from "@/hooks/useHireCharge";
import type { PaymentMethod } from "@/lib/payments/types";
import { cn } from "@/lib/utils";

type Props = {
  charge: HireChargeResult;
  /** Non-prod affordance to simulate a paid webhook. */
  onSimulatePaid?: () => void;
  onSwitchMethod: (method: PaymentMethod) => void;
  waiting?: boolean;
};

function useCountdown(expiresAt: string): { label: string; expired: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return { label: "หมดอายุแล้ว", expired: true };
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return { label: `${m}:${String(s).padStart(2, "0")}`, expired: false };
}

const OTHER_METHODS: { id: PaymentMethod; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "บัตรเครดิต / เดบิต", hint: "อาจมีค่าธรรมเนียมบัตร", icon: CreditCard },
  { id: "bank_transfer", label: "โอนผ่านบัญชีธนาคาร", hint: "แนบสลิปยืนยัน", icon: Landmark },
];

export default function HirePromptPayView({
  charge,
  onSimulatePaid,
  onSwitchMethod,
  waiting = true,
}: Props) {
  const { label: countdown, expired } = useCountdown(charge.expiresAt);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(charge.reference);
      toast.success("คัดลอกเลขอ้างอิงแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-relaxed",
          expired
            ? "bg-destructive/10 text-destructive"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        )}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {expired
            ? "QR หมดอายุ — ปิดแล้วเริ่มชำระใหม่อีกครั้ง"
            : `กรุณาชำระภายใน ${countdown} เพื่อไม่ให้ QR หมดอายุ`}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-border bg-white">
          {charge.qrCodeUri ? (
            <img
              src={charge.qrCodeUri}
              alt="PromptPay QR"
              className="h-full w-full rounded-xl object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <QrCode className="h-24 w-24" strokeWidth={1} />
              <span className="text-[11px]">ตัวอย่าง QR (โหมดทดสอบ)</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{LEGAL_COMPANY_NAME}</p>
          <p className="text-[11px] text-muted-foreground">
            ผู้รับชำระในฐานะตัวกลาง — โอนให้ผู้รับงานหลังอนุมัติงาน
          </p>
        </div>

        <div className="w-full space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">ยอดชำระ</span>
            <span className="font-semibold tabular-nums text-primary">
              {formatOfferAmount(satangToThb(charge.amountSatang))}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">เลขอ้างอิง</span>
            <button
              type="button"
              onClick={() => void copyRef()}
              className="inline-flex items-center gap-1 font-mono text-xs text-foreground hover:text-primary"
            >
              {charge.reference}
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {waiting && !expired ? (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          กำลังรอการยืนยันการชำระเงินจากธนาคาร…
        </p>
      ) : null}

      {!charge.live && onSimulatePaid ? (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full border-dashed"
          onClick={onSimulatePaid}
        >
          จำลองชำระสำเร็จ (โหมดทดสอบ)
        </Button>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">ช่องทางการชำระเงินอื่น ๆ</p>
        {OTHER_METHODS.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSwitchMethod(id)}
            className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{label}</span>
              <span className="block text-[11px] text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
