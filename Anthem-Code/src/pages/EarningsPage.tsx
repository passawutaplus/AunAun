import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, WalletCards } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
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
import EarningsBalanceCards from "@/components/payments/EarningsBalanceCards";
import DisplayCurrencyToggle from "@/components/payments/DisplayCurrencyToggle";
import ManageModeNav from "@/components/dashboard/ManageModeNav";
import { EarningsPlatformIncomeHistory } from "@/components/earnings/EarningsPlatformIncomeHistory";
import { computeGiftablePx } from "@/lib/walletDisplay";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { isAplus1GiftEconomyEnabled } from "@/lib/aplus1Launch";

const EarningsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const giftEconomy = isAplus1GiftEconomyEnabled();
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
    if (giftEconomy) {
      void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user.id] });
    }
  }, [user?.id, qc, giftEconomy]);

  useEffect(() => {
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
  }, [searchParams, setSearchParams, user?.id, qc, giftEconomy]);

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
    <div className={`min-h-screen bg-app-ambient ${MOBILE_PAGE_BOTTOM_CLASS}`}>
      <SeoHead title="กระเป๋า & รายได้" path="/earnings" noindex />

      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-6 lg:pt-8">
          <BackButton
            to="/portfolio"
            label="กลับโปรไฟล์"
            className="mb-4"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <WalletCards className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-medium text-foreground">กระเป๋า</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {giftEconomy
                    ? "ดูรายได้ PX รายได้จ้างงาน และประวัติถอนเงิน"
                    : "ดูรายได้ถอนได้ รายได้จ้างงาน และประวัติถอนเงิน"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
              className="rounded-full"
            >
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </Button>
          </div>
          <ManageModeNav className="mt-4" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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

          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">รายได้จ้างงาน (THB)</h2>
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
          showTopUp={giftEconomy}
        />

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
            <EarningsPlatformIncomeHistory userId={user?.id} />
            <EarningsCashoutHistory items={cashouts} />
          </div>
        </div>

        {giftEconomy ? (
          <>
            <WalletEarnMoreSection />
            <EarningsClosedLoopNote />
          </>
        ) : null}
      </div>

      <CashoutDialog open={cashoutOpen} onOpenChange={setCashoutOpen} />
      {giftEconomy ? <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} /> : null}
    </div>
  );
};

export default EarningsPage;
