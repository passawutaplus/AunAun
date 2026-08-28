import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import StudioLayout from "@/components/dashboard/StudioLayout";
import { EarningsHireWalletPanel } from "@/components/earnings/EarningsHireWalletPanel";
import { computeGiftablePx } from "@/lib/walletDisplay";
import { isAplus1GiftEconomyEnabled, isAplus1PxEnabled } from "@/lib/aplus1Launch";

const EarningsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const pxOn = isAplus1PxEnabled();
  const giftEconomy = isAplus1GiftEconomyEnabled();
  const { data: wallet } = useWallet({ enabled: pxOn });
  const { data: availablePurchased = 0 } = useAvailablePurchasedPx({ enabled: pxOn });
  const { data: gifts = [] } = useGifts({ enabled: giftEconomy });
  const { data: received = [] } = useReceivedGifts(giftEconomy ? user?.id : undefined);
  const { data: cashouts = [] } = useCashoutHistory({ enabled: pxOn });
  const { data: eligibility } = useCreatorEligibility(pxOn ? user?.id : undefined);
  const subData = useSubscription();
  const feeRate = getCashoutFeeRate(subData.tier);
  const feeLabel = formatCashoutFeeLabel(subData.tier);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user?.id || !pxOn) return;
    void qc.invalidateQueries({ queryKey: ["wallet", user.id] });
    void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user.id] });
    if (giftEconomy) {
      void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user.id] });
    }
  }, [user?.id, qc, giftEconomy, pxOn]);

  useEffect(() => {
    if (!pxOn) return;
    const topup = searchParams.get("topup");
    const connect = searchParams.get("connect");
    if (topup === "success") {
      toast.success(giftEconomy ? "เติม Pixel สำเร็จ — ใช้ส่งของขวัญได้ทันที" : "เติม Pixel สำเร็จ");
      notifyAnthem({ event: "topup" });
      if (user?.id) {
        void qc.invalidateQueries({ queryKey: ["wallet", user.id] });
        void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user.id] });
        if (giftEconomy) {
          void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user.id] });
        }
      }
      searchParams.delete("topup");
      setSearchParams(searchParams, { replace: true });
    } else if (connect === "success") {
      toast.success("เชื่อมบัญชี Stripe Connect แล้ว");
      searchParams.delete("connect");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user?.id, qc, giftEconomy, pxOn]);

  const giftablePx = computeGiftablePx(wallet, availablePurchased);

  const giftById = useMemo(() => new Map(gifts.map((g) => [g.id, g])), [gifts]);
  const senderIds = useMemo(
    () => Array.from(new Set(received.map((g) => g.sender_id))),
    [received],
  );

  const { data: senders = [] } = useQuery({
    queryKey: ["gift-senders", senderIds],
    enabled: giftEconomy && senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
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
        ? giftEconomy
          ? "ครบ Welcome Bonus, ผลงาน, ผู้ติดตาม, ชวนเพื่อน และยืนยันตัวตนก่อนถอน"
          : "ยืนยันตัวตนและเงื่อนไขถอนให้ครบก่อน"
        : `อีก ${Math.max(0, MIN_CASHOUT_PX - earnedPx).toLocaleString()} px ถึงขั้นต่ำถอน`;

  return (
    <StudioLayout>
      <SeoHead title="My Studio — ธุรกรรม" path="/earnings" noindex />

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

      <EarningsHireWalletPanel
        userId={user?.id}
        forcePreview={searchParams.get("preview") === "wallet"}
      />

      {pxOn ? (
        <EarningsQuickActions
          onTopUp={() => setTopupOpen(true)}
          showTopUp={giftEconomy}
        />
      ) : null}

      {giftEconomy || pxOn ? (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {giftEconomy ? (
            <div className="space-y-5">
              <DailyPxClaimCard />
              {eligibility && (
                <EarningsCashoutReadiness eligibility={eligibility} earnedPx={earnedPx} />
              )}
              <EarningsGiftCatalog gifts={gifts} />
            </div>
          ) : null}
          <div className={giftEconomy ? "space-y-5" : "space-y-5 lg:col-span-2"}>
            {giftEconomy ? (
              <EarningsGiftFeed
                items={received}
                giftById={giftById}
                senderById={senderById}
                onGoPortfolio={() => navigate("/portfolio")}
              />
            ) : null}
            {pxOn ? <EarningsCashoutHistory items={cashouts} /> : null}
          </div>
        </div>
      ) : null}

      {giftEconomy ? (
        <>
          <WalletEarnMoreSection />
          <EarningsClosedLoopNote />
        </>
      ) : null}

      {pxOn ? <CashoutDialog open={cashoutOpen} onOpenChange={setCashoutOpen} /> : null}
      {giftEconomy ? <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} /> : null}
    </StudioLayout>
  );
};

export default EarningsPage;
