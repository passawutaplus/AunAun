import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CashoutDialog from "@/components/gifting/CashoutDialog";
import TopUpDialog from "@/components/gifting/TopUpDialog";
import { EarningsHeroCard } from "@/components/earnings/EarningsHeroCard";
import { EarningsQuickActions } from "@/components/earnings/EarningsQuickActions";
import { EarningsCashoutHistory } from "@/components/earnings/EarningsCashoutHistory";
import { EarningsPlatformIncomeHistory } from "@/components/earnings/EarningsPlatformIncomeHistory";
import EarningsBalanceCards from "@/components/payments/EarningsBalanceCards";
import DisplayCurrencyToggle from "@/components/payments/DisplayCurrencyToggle";
import { useWallet, useAvailablePurchasedPx } from "@/hooks/useWallet";
import {
  useCashoutHistory,
  MIN_CASHOUT_PX,
  getCashoutFeeRate,
  formatCashoutFeeLabel,
} from "@/hooks/useCashout";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import { useSubscription } from "@/core/subscription/useSubscription";
import { computeGiftablePx } from "@/lib/walletDisplay";
import { isAplus1GiftEconomyEnabled } from "@/lib/aplus1Launch";

type Props = {
  userId: string;
};

/** Wallet category block for the combined /dashboard page. */
export default function DashboardWalletSection({ userId }: Props) {
  const navigate = useNavigate();
  const giftEconomy = isAplus1GiftEconomyEnabled();
  const { data: wallet } = useWallet();
  const { data: availablePurchased = 0 } = useAvailablePurchasedPx();
  const { data: cashouts = [] } = useCashoutHistory();
  const { data: eligibility } = useCreatorEligibility(userId);
  const { data: subData } = useSubscription();
  const feeRate = getCashoutFeeRate(subData?.profileTier);
  const feeLabel = formatCashoutFeeLabel(subData?.profileTier);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);

  const giftablePx = computeGiftablePx(wallet, availablePurchased);
  const lifetimeEarned = wallet?.lifetime_earned_px ?? 0;
  const earnedPx = wallet?.earned_px ?? 0;
  const netThb = Math.floor(earnedPx * (1 - feeRate));
  const canCashout = earnedPx >= MIN_CASHOUT_PX && eligibility?.canCashout === true;

  const cashoutHint = useMemo(() => {
    if (canCashout) return undefined;
    if (eligibility && !eligibility.canCashout) {
      return giftEconomy
        ? "ครบ Welcome Bonus, ผลงาน, ผู้ติดตาม, ชวนเพื่อน และยืนยันตัวตนก่อนถอน"
        : "ยืนยันตัวตนและเงื่อนไขถอนให้ครบก่อน";
    }
    return `อีก ${Math.max(0, MIN_CASHOUT_PX - earnedPx).toLocaleString()} px ถึงขั้นต่ำถอน`;
  }, [canCashout, eligibility, earnedPx, giftEconomy]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <EarningsHeroCard
          netThb={netThb}
          earnedPx={earnedPx}
          giftablePx={giftablePx}
          lifetimeEarned={lifetimeEarned}
          feeLabel={feeLabel}
          showGiftable={giftEconomy}
        />

        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">รายได้จ้างงาน (THB)</h3>
            <DisplayCurrencyToggle />
          </div>
          <EarningsBalanceCards
            pendingSatang={0}
            availableSatang={0}
            payoutReservedSatang={0}
            paidOutSatang={0}
          />
          <p className="text-[11px] text-muted-foreground">
            ยอดจ้างงานผ่าน Aplus1/Omise จะแสดงที่นี่หลังเปิดรับชำระ — แยกจากกระเป๋า PX
          </p>
        </div>
      </div>

      <EarningsQuickActions
        onTopUp={() => setTopupOpen(true)}
        onCashout={() => setCashoutOpen(true)}
        onReferral={() => navigate("/referrals")}
        canCashout={canCashout}
        cashoutHint={cashoutHint}
        showTopUp={giftEconomy}
      />

      <EarningsPlatformIncomeHistory userId={userId} />
      <EarningsCashoutHistory items={cashouts} />

      <CashoutDialog open={cashoutOpen} onOpenChange={setCashoutOpen} />
      {giftEconomy ? <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} /> : null}
    </>
  );
}
