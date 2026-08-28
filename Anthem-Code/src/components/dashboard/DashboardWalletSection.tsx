import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CashoutDialog from "@/components/gifting/CashoutDialog";
import TopUpDialog from "@/components/gifting/TopUpDialog";
import { EarningsHeroCard } from "@/components/earnings/EarningsHeroCard";
import { EarningsQuickActions } from "@/components/earnings/EarningsQuickActions";
import { EarningsCashoutHistory } from "@/components/earnings/EarningsCashoutHistory";
import { EarningsHireWalletPanel } from "@/components/earnings/EarningsHireWalletPanel";
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
import { isAplus1GiftEconomyEnabled, isAplus1PxEnabled } from "@/lib/aplus1Launch";

type Props = {
  userId: string;
};

/** Wallet category block for the combined /dashboard page. */
export default function DashboardWalletSection({ userId }: Props) {
  const pxOn = isAplus1PxEnabled();
  const giftEconomy = isAplus1GiftEconomyEnabled();
  const { data: wallet } = useWallet({ enabled: pxOn });
  const { data: availablePurchased = 0 } = useAvailablePurchasedPx({ enabled: pxOn });
  const { data: cashouts = [] } = useCashoutHistory({ enabled: pxOn });
  const { data: eligibility } = useCreatorEligibility(pxOn ? userId : undefined);
  const subData = useSubscription();
  const feeRate = getCashoutFeeRate(subData.tier);
  const feeLabel = formatCashoutFeeLabel(subData.tier);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [searchParams] = useSearchParams();

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
      {pxOn ? (
        <EarningsHeroCard
          netThb={netThb}
          earnedPx={earnedPx}
          giftablePx={giftablePx}
          lifetimeEarned={lifetimeEarned}
          feeLabel={feeLabel}
          showGiftable={giftEconomy}
          onCashout={() => setCashoutOpen(true)}
          canCashout={canCashout}
          cashoutHint={cashoutHint}
        />
      ) : null}

      {pxOn ? (
        <EarningsQuickActions
          onTopUp={() => setTopupOpen(true)}
          showTopUp={giftEconomy}
        />
      ) : null}

      <EarningsHireWalletPanel
        userId={userId}
        forcePreview={searchParams.get("preview") === "wallet"}
      />
      {pxOn ? <EarningsCashoutHistory items={cashouts} /> : null}

      {pxOn ? <CashoutDialog open={cashoutOpen} onOpenChange={setCashoutOpen} /> : null}
      {giftEconomy ? <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} /> : null}
    </>
  );
}
