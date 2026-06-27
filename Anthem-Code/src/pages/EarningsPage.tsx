import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Banknote, Gift as GiftIcon, Coins, Pencil, Coffee, Highlighter, PenTool, Palette, Laptop, ShieldCheck, Lock, UserPlus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, useAvailablePurchasedPx } from "@/hooks/useWallet";
import { useReceivedGifts, useGifts } from "@/hooks/useGifting";
import { useCashoutHistory, MIN_CASHOUT_PX, getCashoutFeeRate, formatCashoutFeeLabel, cashoutStatusLabel } from "@/hooks/useCashout";
import { useSubscription } from "@/core/subscription/useSubscription";
import CashoutDialog from "@/components/gifting/CashoutDialog";
import TopUpDialog from "@/components/gifting/TopUpDialog";
import { formatThaiDate } from "@/lib/format";
import SeoHead from "@/components/SeoHead";
import { toast } from "sonner";
import { notifyAnthem } from "@/lib/notifyAnthem";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import CreatorEligibilityProgress from "@/components/verification/CreatorEligibilityProgress";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Pencil, Coffee, Highlighter, PenTool, Palette, Laptop,
};

const EarningsPage = () => {
  const navigate = useNavigate();
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
    const topup = searchParams.get("topup");
    const connect = searchParams.get("connect");
    if (topup === "success") {
      toast.success("เติม Pixel สำเร็จ — ใช้ส่งของขวัญได้ทันที");
      notifyAnthem({ event: "topup" });
      searchParams.delete("topup");
      setSearchParams(searchParams, { replace: true });
    } else if (connect === "success") {
      toast.success("เชื่อมบัญชี Stripe Connect แล้ว");
      searchParams.delete("connect");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const giftById = useMemo(() => new Map(gifts.map((g) => [g.id, g])), [gifts]);
  const senderIds = useMemo(
    () => Array.from(new Set(received.map((g) => g.sender_id))),
    [received]
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
  const purchasedPx = wallet?.purchased_px ?? 0;
  
  const canCashout = earnedPx >= MIN_CASHOUT_PX && eligibility?.canCashout === true;

  return (
    <div className="min-h-screen bg-app-ambient">
      <SeoHead title="รายได้ของฉัน" path="/earnings" noindex />
      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          <h1 className="text-sm font-semibold">รายได้ของฉัน</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {eligibility && <CreatorEligibilityProgress data={eligibility} />}

        <div className="rounded-xl border border-border bg-card p-4 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">ชวนเพื่อน รับ 50 px ต่อคน</p>
            <p className="text-muted-foreground mt-1 text-xs">
              รับเมื่อเพื่อนสมัครและเผยแพร่ผลงานหรือโพสต์ครั้งแรกสำเร็จ
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full shrink-0">
            <Link to="/referrals">
              <UserPlus className="w-4 h-4 mr-1.5" /> ดูลิงก์ชวนเพื่อน
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-base text-foreground leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">เติม Pixel ด้วย Stripe</p>
            <p className="text-muted-foreground mt-1 text-xs">
              1 px = 1 บาท · ชำระผ่าน Stripe Checkout · ยอดเติมใช้ส่งของขวัญได้ทันที
            </p>
          </div>
          <Button
            onClick={() => setTopupOpen(true)}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            <Coins className="w-4 h-4 mr-1.5" /> เติม Pixel
          </Button>
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Coins}
            label="ได้รับจากของขวัญ (ถอนได้)"
            value={earnedPx.toLocaleString()}
            unit="px"
            note="เฉพาะ px ที่ได้รับจากผู้สนับสนุนเท่านั้น"
            highlight
          />
          <StatCard
            icon={Sparkles}
            label="Pixel ที่เติม (ส่งของขวัญ)"
            value={availablePurchased.toLocaleString()}
            unit="px"
            note="ใช้ส่งของขวัญได้ทันทีหลังเติม"
          />
          <StatCard
            icon={Banknote}
            label="มูลค่าถอนได้โดยประมาณ"
            value={`฿ ${Math.floor(earnedPx * (1 - feeRate)).toLocaleString()}`}
            note={`หลังหักค่าธรรมเนียม ${feeLabel} · สะสมรวม ${lifetimeEarned.toLocaleString()} px`}
          />
        </div>

        {/* AML disclaimer */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-base text-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-0.5">ระบบ Closed-Loop เพื่อป้องกันการฟอกเงิน</p>
            <p>
              ถอนได้เฉพาะ Pixel ที่ได้จาก<span className="font-medium text-foreground">ของขวัญที่ผู้สนับสนุนส่งให้</span> เท่านั้น
              ส่วน Pixel ที่คุณเติมเองจะใช้ส่งของขวัญได้อย่างเดียว (ถอนไม่ได้)
              การถอนเงินจำเป็นต้องผ่านการยืนยันตัวตน (KYC) เสร็จสิ้นก่อน
            </p>
          </div>
        </div>

        {/* Cashout action */}
        <div className="rounded-2xl glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" /> ถอนเข้าบัญชี
            </h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              ขั้นต่ำ {MIN_CASHOUT_PX.toLocaleString()} px จาก earned · ค่าธรรมเนียม {feeLabel} · ต้องครบเงื่อนไขและ KYC
            </p>
          </div>
          <Button
            onClick={() => setCashoutOpen(true)}
            disabled={!canCashout}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            title={
              canCashout
                ? "ถอนเข้าบัญชี"
                : eligibility && !eligibility.canCashout
                  ? "ครบ Welcome Bonus, ผู้ติดตาม และยืนยันตัวตนก่อนถอน"
                  : `ต้องมี earned ≥ ${MIN_CASHOUT_PX.toLocaleString()} px`
            }
          >
            <Banknote className="w-4 h-4 mr-1.5" />
            {canCashout ? "ขอถอนเงิน" : `ต้องมี earned ≥ ${MIN_CASHOUT_PX.toLocaleString()} px`}
          </Button>
        </div>

        {/* Recent gifts */}
        <section className="rounded-2xl glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <GiftIcon className="w-5 h-5 text-primary" />
            <h2 className="font-medium text-foreground">ของขวัญที่ได้รับ</h2>
            <span className="text-xs text-muted-foreground">({received.length})</span>
          </div>
          {received.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ยังไม่มีคนส่งของขวัญให้คุณ — ลงผลงานเจ๋งๆ ไว้รอเลย!
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="font-normal px-2 py-2">ผู้สนับสนุน</th>
                    <th className="font-normal px-2 py-2">ของขวัญ</th>
                    <th className="font-normal px-2 py-2">ข้อความ</th>
                    <th className="font-normal px-2 py-2 text-right">วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {received.map((tx) => {
                    const g = giftById.get(tx.gift_id);
                    const Icon = g ? ICON_MAP[g.icon] ?? GiftIcon : GiftIcon;
                    const sender = senderById.get(tx.sender_id);
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition">
                        <td className="px-2 py-3">
                          <Link to={`/u/${tx.sender_id}`} className="flex items-center gap-2 hover:text-primary">
                            {sender?.avatar_url ? (
                              <img src={sender.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs">
                                {(sender?.display_name ?? "?")[0]}
                              </div>
                            )}
                            <span className="text-sm truncate max-w-[120px]">{sender?.display_name ?? "ผู้ใช้"}</span>
                          </Link>
                        </td>
                        <td className="px-2 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                            <span>{g?.name_th ?? "ของขวัญ"}</span>
                            <span className="text-primary font-medium tabular-nums">+{tx.price_px} px</span>
                          </span>
                        </td>
                        <td className="px-2 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={tx.message}>
                          {tx.message || "—"}
                        </td>
                        <td className="px-2 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">
                          {formatThaiDate(tx.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Cashout history */}
        <section className="rounded-2xl glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-5 h-5 text-primary" />
            <h2 className="font-medium text-foreground">ประวัติการถอน</h2>
            <span className="text-xs text-muted-foreground">({cashouts.length})</span>
          </div>
          {cashouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ยังไม่เคยถอน</p>
          ) : (
            <div className="space-y-2">
              {cashouts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      ฿ {c.net_px.toLocaleString()}
                      <span className="text-xs text-muted-foreground ml-2">
                        (จาก {c.gross_px.toLocaleString()} px · ค่าธรรมเนียม {c.fee_px.toLocaleString()} px)
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.bank_info?.bank ?? "—"} · {c.bank_info?.account_number ?? ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      c.status === "mock_paid" || c.status === "paid"
                        ? "bg-primary/10 text-primary"
                        : c.status === "rejected" || c.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : c.status === "processing"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {cashoutStatusLabel(c.status)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatThaiDate(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <CashoutDialog open={cashoutOpen} onOpenChange={setCashoutOpen} />
      <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} />
    </div>
  );
};

const StatCard = ({
  icon: Icon, label, value, unit, note, highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  note?: string;
  highlight?: boolean;
}) => (
  <div className={`rounded-2xl glass-panel p-5 ${highlight ? "ring-2 ring-primary/30" : ""}`}>
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className={`w-4 h-4 ${highlight ? "text-primary" : ""}`} />
      <span className="text-xs">{label}</span>
    </div>
    <p className={`mt-2 text-2xl font-semibold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
      {value}
      {unit && <span className="text-sm text-muted-foreground ml-1 font-normal">{unit}</span>}
    </p>
    {note && <p className="text-[11px] text-muted-foreground mt-1">{note}</p>}
  </div>
);

export default EarningsPage;
