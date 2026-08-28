import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EarningsHireBalanceCard } from "@/components/earnings/EarningsHireBalanceCard";
import { EarningsIncomeChart } from "@/components/earnings/EarningsIncomeChart";
import { EarningsTransactionHistory } from "@/components/earnings/EarningsTransactionHistory";
import EarningsBalanceCards from "@/components/payments/EarningsBalanceCards";
import DisplayCurrencyToggle from "@/components/payments/DisplayCurrencyToggle";
import { useHireWallet } from "@/hooks/useHireWallet";
import { PAYOUT_MIN_SATANG } from "@/lib/payments/payoutPolicy";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";
import type { HireIncomeFilter } from "@/lib/payments/hireWallet";
import { withdrawStartPath } from "@/lib/payments/withdrawPin";

type Props = {
  userId: string | undefined;
  forcePreview?: boolean;
};

/** Hire THB wallet: available balance, status buckets, unified transaction history. */
export function EarningsHireWalletPanel({ userId, forcePreview }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { view, isLoading, isPreview, resetPreview } = useHireWallet(
    userId,
    { forcePreview },
  );
  const [incomeFilter, setIncomeFilter] = useState<HireIncomeFilter>("all");

  const cardFilter =
    incomeFilter === "pending" || incomeFilter === "transferring" || incomeFilter === "paid_out"
      ? incomeFilter
      : null;

  const canWithdraw = isPreview && view.availableSatang >= PAYOUT_MIN_SATANG;
  const withdrawHint = !isPreview
    ? "ระบบถอนจริงกำลังเปิด — ทดลองกดได้ในเดโม่หรือโหมดตัวอย่าง"
    : view.availableSatang < PAYOUT_MIN_SATANG
      ? `อีก ${formatMoneyLabel(satangToThb(Math.max(0, PAYOUT_MIN_SATANG - view.availableSatang)), "THB")} ถึงขั้นต่ำถอน`
      : undefined;

  const preview = forcePreview || searchParams.get("preview") === "wallet";
  const goWithdraw = () => {
    navigate(withdrawStartPath({ preview }));
  };

  return (
    <div className="space-y-6">
      <EarningsHireBalanceCard
        availableSatang={view.availableSatang}
        onWithdraw={goWithdraw}
        canWithdraw={canWithdraw}
        withdrawHint={withdrawHint}
        isPreview={isPreview}
        bankName={view.bankName}
        accountLast4={view.accountLast4}
        onResetPreview={isPreview ? resetPreview : undefined}
      />

      <div className="space-y-3 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">รายได้จ้างงาน (THB)</h2>
          <DisplayCurrencyToggle />
        </div>
        <EarningsBalanceCards
          pendingSatang={view.pendingSatang}
          payoutReservedSatang={view.payoutReservedSatang}
          paidOutSatang={view.paidOutSatang}
          activeFilter={cardFilter}
          onFilterClick={(next) => setIncomeFilter((cur) => (cur === next ? "all" : next))}
        />
        <p className="text-[11px] text-muted-foreground">กดการ์ดเพื่อดูว่างานไหนอยู่ในหมวดนั้น</p>
      </div>

      <EarningsIncomeChart income={view.income} preview={isPreview} />

      <EarningsTransactionHistory
        income={view.income}
        payouts={view.payouts}
        isLoading={isLoading}
        isPreview={isPreview}
        status={incomeFilter}
        onStatusChange={setIncomeFilter}
      />
    </div>
  );
}
