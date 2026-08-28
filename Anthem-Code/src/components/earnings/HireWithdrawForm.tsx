import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WithdrawPinDialog } from "@/components/earnings/WithdrawPinDialog";
import { useAuth } from "@/hooks/useAuth";
import { satangToThb, thbToSatang } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import {
  applyPreviewWithdraw,
  payoutEligibilityReasonTh,
  type HirePayoutItem,
  type HireWalletView,
} from "@/lib/payments/hireWallet";
import { evaluateManualPayout, PAYOUT_FEE_SATANG, PAYOUT_MIN_SATANG } from "@/lib/payments/payoutPolicy";
import { maskBankAccount } from "@/lib/payments/payoutService";
import { digitsFromThbInput, formatThbGrouped } from "@/lib/payments/thbInput";
import {
  hasWithdrawPin,
  saveWithdrawPin,
  verifyWithdrawPin,
  withdrawPinOwnerKey,
} from "@/lib/payments/withdrawPin";
import { SETTINGS_PIN_RECOVER_HREF } from "@/lib/settingsNav";
import { cn } from "@/lib/utils";

type Props = {
  view: HireWalletView;
  isPreview: boolean;
  startWithAll?: boolean;
  cancelTo: string;
  onConfirm: (amountSatang: number) => ReturnType<typeof applyPreviewWithdraw>;
};

/** Withdraw form: amount, bank method, PIN confirm, processing receipt. */
export function HireWithdrawForm({
  view,
  isPreview,
  startWithAll = false,
  cancelTo,
  onConfirm,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerKey = withdrawPinOwnerKey(user?.id);
  const maxThb = Math.floor(satangToThb(view.availableSatang));
  const [digits, setDigits] = useState(() => (startWithAll && maxThb > 0 ? String(maxThb) : ""));
  const [pending, setPending] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinReady, setPinReady] = useState(() => hasWithdrawPin(ownerKey));
  const [done, setDone] = useState<HirePayoutItem | null>(null);

  useEffect(() => {
    if (startWithAll) {
      const next = Math.floor(satangToThb(view.availableSatang));
      setDigits(next > 0 ? String(next) : "");
    }
  }, [startWithAll, view.availableSatang]);

  useEffect(() => {
    setPinReady(hasWithdrawPin(ownerKey));
  }, [ownerKey]);

  const amountSatang = useMemo(() => {
    if (!digits) return 0;
    return thbToSatang(Number(digits));
  }, [digits]);

  const eligibility = evaluateManualPayout({
    availableSatang: amountSatang,
    freeWithdrawalsUsedThisMonth: view.freeWithdrawalsUsedThisMonth,
    bankVerified: true,
    kycVerified: true,
    isManual: true,
  });
  const withinBalance = amountSatang > 0 && amountSatang <= view.availableSatang;
  const canSubmit = eligibility.ok && withinBalance && !pending;
  const masked = view.accountLast4 ? maskBankAccount(`0000${view.accountLast4}`) : "****4521";
  const bankName = view.bankName || "กสิกรไทย";
  const freeLeft = view.freeWithdrawalsUsedThisMonth < 1;
  const freeTransferCopy = freeLeft
    ? "ครั้งแรกของเดือนนี้ไม่มีค่าธรรมเนียมโอน · ครั้งถัดไป ฿25"
    : `เดือนนี้ใช้โควต้าถอนฟรีแล้ว · ค่าธรรมเนียมโอน ${formatMoneyLabel(satangToThb(PAYOUT_FEE_SATANG), "THB")}`;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setPinOpen(true);
  };

  const confirmWithPin = async (pin: string) => {
    if (!pinReady) {
      await saveWithdrawPin(ownerKey, pin);
      setPinReady(true);
    } else {
      const result = await verifyWithdrawPin(ownerKey, pin);
      if (!result.ok) return result;
    }
    const ok = { ok: true } as const;
    setPinOpen(false);
    setPending(true);
    try {
      const payout = onConfirm(amountSatang);
      if (payout.ok === false) {
        toast.error(payoutEligibilityReasonTh(payout.reason));
        return ok;
      }
      setDone(payout.next.payouts[0] ?? null);
      return ok;
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <WithdrawProcessingCard
        payout={done}
        bankName={bankName}
        masked={masked}
        isPreview={isPreview}
        onBack={() => navigate(cancelTo, { replace: true })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <CreditCard className="h-5 w-5 text-foreground" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-medium">{bankName}</p>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  ค่าเริ่มต้น
                </span>
              </div>
              <p className="mt-0.5 text-sm tabular-nums text-foreground">{masked}</p>
              {view.accountName ? (
                <p className="text-xs text-muted-foreground">{view.accountName}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 text-right">
            <span className="text-xs font-medium text-muted-foreground">THB</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              ถูกต้อง
            </span>
            <Link
              to="/dashboard/payout"
              className="text-xs font-medium text-primary hover:underline"
            >
              จัดการบัญชีธนาคาร
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <label htmlFor="hire-withdraw-amount" className="text-sm font-medium text-foreground">
          จำนวนเงิน
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary">
          <span className="text-base font-medium text-muted-foreground">฿</span>
          <input
            id="hire-withdraw-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={formatThbGrouped(digits)}
            onChange={(e) => setDigits(digitsFromThbInput(e.target.value))}
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40"
          />
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
            onClick={() => setDigits(maxThb > 0 ? String(maxThb) : "")}
            disabled={maxThb <= 0}
          >
            ถอนทั้งหมด
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card px-3.5 py-3">
          <p className="text-sm font-medium text-foreground">โอนฟรี</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{freeTransferCopy}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            ยอดที่ถอนได้ {formatMoneyLabel(satangToThb(view.availableSatang), "THB")}
            {" · "}ขั้นต่ำ {formatMoneyLabel(satangToThb(PAYOUT_MIN_SATANG), "THB")}
            {isPreview ? " · ทดลองกดได้" : ""}
          </p>
        </div>
      </section>

      <section className="space-y-2 rounded-xl bg-muted/50 p-4">
        <Row label="ยอดถอน" value={formatMoneyLabel(satangToThb(amountSatang), "THB")} />
        <Row
          label={eligibility.usesFreeSlot ? "ค่าธรรมเนียมโอน (โอนฟรี)" : "ค่าธรรมเนียมโอน"}
          value={
            eligibility.usesFreeSlot
              ? "โอนฟรี"
              : `−${formatMoneyLabel(satangToThb(eligibility.feeSatang), "THB")}`
          }
          muted
        />
        <div className="border-t border-border/70 pt-2">
          <Row
            label="จะได้รับสุทธิ"
            value={formatMoneyLabel(satangToThb(Math.max(eligibility.transferSatang, 0)), "THB")}
            bold
          />
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        เงินจะเข้าบัญชีภายในไม่กี่วันทำการ หลังรอบโอนรายสัปดาห์ — ไม่ใช่เข้าทันทีวันนี้
        {isPreview ? " · รอบนี้เป็นตัวอย่างสำหรับทดลองกดถอน" : ""}
      </p>

      {!canSubmit && amountSatang > 0 ? (
        <p className="text-xs text-destructive" role="alert">
          {!withinBalance
            ? payoutEligibilityReasonTh("exceeds_balance")
            : payoutEligibilityReasonTh(eligibility.reason)}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-full"
          onClick={() => navigate(cancelTo)}
          disabled={pending}
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "h-12 flex-[1.4] rounded-full text-base",
            canSubmit ? "bg-primary text-primary-foreground hover:bg-primary/90" : "",
          )}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ยืนยันถอนเงิน
        </Button>
      </div>

      <WithdrawPinDialog
        open={pinOpen}
        mode={pinReady ? "verify" : "setup"}
        busy={pending}
        onCancel={() => setPinOpen(false)}
        onConfirm={confirmWithPin}
        onForgotPin={() => {
          setPinOpen(false);
          navigate(SETTINGS_PIN_RECOVER_HREF);
        }}
      />
    </div>
  );
}

function WithdrawProcessingCard({
  payout,
  bankName,
  masked,
  isPreview,
  onBack,
}: {
  payout: HirePayoutItem;
  bankName: string;
  masked: string;
  isPreview: boolean;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">กำลังดำเนินการถอนเงิน</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        เงินจะเข้าบัญชีหลังรอบโอนรายสัปดาห์ — ไม่ใช่เข้าทันทีวันนี้
      </p>
      <dl className="mt-6 space-y-2.5 text-left text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">จำนวนที่ถอน</dt>
          <dd className="font-medium tabular-nums">{formatMoneyLabel(satangToThb(payout.amountSatang), "THB")}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">จะได้รับสุทธิ</dt>
          <dd className="font-semibold tabular-nums text-primary">
            {formatMoneyLabel(satangToThb(payout.transferSatang), "THB")}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">โอนไปยัง</dt>
          <dd className="text-right font-medium">
            {bankName} {masked}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">รหัสรายการ</dt>
          <dd className="break-all text-right font-medium tabular-nums">{payout.id}</dd>
        </div>
      </dl>
      {isPreview ? (
        <p className="mt-4 text-[11px] text-muted-foreground">ตัวอย่าง — ยังไม่โอนเข้าบัญชีจริง</p>
      ) : null}
      <Button type="button" className="mt-6 h-11 w-full rounded-full" onClick={onBack}>
        กลับ
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`${muted ? "text-muted-foreground" : "text-foreground/80"} text-sm`}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-base font-semibold text-primary" : "text-sm text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
