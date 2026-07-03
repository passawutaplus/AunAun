import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, useAvailablePurchasedPx } from "@/hooks/useWallet";
import { useReceivedGifts, useGifts } from "@/hooks/useGifting";
import {
  useCashoutHistory,
  MIN_CASHOUT_PX,
  getCashoutFeeRate,
  formatCashoutFeeLabel,
} from "@/hooks/useCashout";
import { useSubscription } from "@/core/subscription/useSubscription";
import CashoutDialog from "@/components/gifting/CashoutDialog";
import TopUpDialog from "@/components/gifting/TopUpDialog";
import DailyPxClaimCard from "@/components/gifting/DailyPxClaimCard";
import WalletEarnMoreSection from "@/components/gifting/WalletEarnMoreSection";
import SeoHead from "@/components/SeoHead";
import { toast } from "sonner";
import { notifyAnthem } from "@/lib/notifyAnthem";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import { EarningsHeroCard } from "@/components/earnings/EarningsHeroCard";
import { EarningsQuickActions } from "@/components/earnings/EarningsQuickActions";
import { EarningsCashoutReadiness } from "@/components/earnings/EarningsCashoutReadiness";
import { EarningsGiftFeed } from "@/components/earnings/EarningsGiftFeed";
import EarningsGiftCatalog from "@/components/earnings/EarningsGiftCatalog";
import { EarningsCashoutHistory } from "@/components/earnings/EarningsCashoutHistory";
import { EarningsClosedLoopNote } from "@/components/earnings/EarningsClosedLoopNote";
import { computeGiftablePx } from "@/lib/walletDisplay";

const EarningsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const { data: availablePurchased = 0 } = useAvailablePurchasedPx();
  const { data: gifts = [] } = useGifts();
  const { data: received = [] } = useReceivedGifts(user?.id);
  const { data: cashouts = [] } = useCashoutHistory();
  const { data: eligibility } = useCreatorEligibility(user?.id);
  const { data: subData } = useSubscription();
  const feeRate = getCashoutFeeRate(subData?.profileTier);
  const feeLabel = formatCashoutFeeLabel(subData?.profileTier);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user?.id) return;
    void qc.invalidateQueries({ queryKey: ["wallet", user.id] });
    void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user.id] });
    void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user.id] });
  }, [user?.id, qc]);

  useEffect(() => {
    const topup = searchParams.get("topup");
    const connect = searchParams.get("connect");
    if (topup === "success") {
      toast.success("เติม Pixel สำเร็จ — ใช้ส่งของขวัญได้ทันที");
      notifyAnthem({ event: "topup" });
      if (user?.id) {
        void qc.invalidateQueries({ queryKey: ["wallet", user.id] });
        void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user.id] });
        void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user.id] });
      }
      searchParams.delete("topup");
      setSearchParams(searchParams, { replace: true });
    } else if (connect === "success") {
      toast.success("เชื่อมบัญชี Stripe Connect แล้ว");
      searchParams.delete("connect");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user?.id, qc]);

  const giftablePx = computeGiftablePx(wallet, availablePurchased);

  const giftById = useMemo(() => new Map(gifts.map((g) => [g.id, g])), [gifts]);
  const senderIds = useMemo(
    () => Array.from(new Set(received.map((g) => g.sender_id))),
    [received],
  );

  const { data: senders = [] } = useQuery({
    queryKey: ["gift-senders", senderIds],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", senderIds);
      return data ?? [];
    },
  });
  const senderById = useMemo(() => new Map(senders.map((s) => [s.id, s])), [senders]);

  const lifetimeEarned = wallet?.lifetime_earned_px ?? 0;
  const earnedPx = wallet?.earned_px ?? 0;
  const netThb = Math.floor(earnedPx * (1 - feeRate));
  const canCashout = earnedPx >= MIN_CASHOUT_PX && eligibility?.canCashout === true;

  const cashoutHint =
    canCashout
      ? undefined
      : eligibility && !eligibility.canCashout
        ? "ครบ Welcome Bonus, ผลงาน, ผู้ติดตาม, ชวนเพื่อน และยืนยันตัวตนก่อนถอน"
        : `อีก ${Math.max(0, MIN_CASHOUT_PX - earnedPx).toLocaleString()} px ถึงขั้นต่ำถอน`;

  return (
    <div className="min-h-screen bg-app-ambient">
      <SeoHead title="รายได้ของฉัน" path="/earnings" noindex />
      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          <h1 className="text-sm font-semibold">รายได้ของฉัน</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
        <EarningsHeroCard
          netThb={netThb}
          earnedPx={earnedPx}
          giftablePx={giftablePx}
          lifetimeEarned={lifetimeEarned}
          feeLabel={feeLabel}
        />

        <EarningsQuickActions
          onTopUp={() => setTopupOpen(true)}
          onCashout={() => setCashoutOpen(true)}
          onReferral={() => navigate("/referrals")}
          canCashout={canCashout}
          cashoutHint={cashoutHint}
        />

        <DailyPxClaimCard />

        {eligibility && (
          <EarningsCashoutReadiness eligibility={eligibility} earnedPx={earnedPx} />
        )}

        <EarningsGiftCatalog gifts={gifts} />

        <EarningsGiftFeed
          items={received}
          giftById={giftById}
          senderById={senderById}
          onGoPortfolio={() => navigate("/portfolio/manage")}
        />

        <EarningsCashoutHistory items={cashouts} />

        <WalletEarnMoreSection />

        <EarningsClosedLoopNote />
      </div>

      <CashoutDialog open={cashoutOpen} onOpenChange={setCashoutOpen} />
      <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} />
    </div>
  );
};

export default EarningsPage;
