import { Banknote, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  netThb: number;
  earnedPx: number;
  giftablePx: number;
  lifetimeEarned: number;
  feeLabel: string;
  showGiftable?: boolean;
  onCashout?: () => void;
  canCashout?: boolean;
  cashoutHint?: string;
};

/** Hero: estimated cashout value. Optional giftable PX when gift economy is on. */
export function EarningsHeroCard({
  netThb,
  earnedPx,
  giftablePx,
  lifetimeEarned,
  feeLabel,
  showGiftable = true,
  onCashout,
  canCashout = false,
  cashoutHint,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-foreground text-background p-6 shadow-lg shadow-foreground/10">
        <p className="text-xs text-background/70 font-medium">มูลค่าถอนได้โดยประมาณ</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
          ฿ {netThb.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-background/75 tabular-nums">
          จาก {earnedPx.toLocaleString()} px ที่ถอนได้
        </p>
        <p className="mt-1 text-xs text-background/60">
          สะสมรวม {lifetimeEarned.toLocaleString()} px · หลังหักค่าธรรมเนียม {feeLabel}
        </p>
        {onCashout ? (
          <button
            type="button"
            onClick={onCashout}
            disabled={!canCashout}
            title={!canCashout ? cashoutHint : "ถอนเงิน"}
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              canCashout
                ? "bg-background text-foreground hover:bg-background/90"
                : "bg-background/15 text-background/50 cursor-not-allowed",
            )}
          >
            <Banknote className="h-3.5 w-3.5" />
            ถอนเงิน
          </button>
        ) : null}
      </div>

      {showGiftable ? (
        <div className="rounded-2xl glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-medium">ส่งของขวัญได้</span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-primary">
            {giftablePx.toLocaleString()} px
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">เติมเอง · ถอนไม่ได้</p>
        </div>
      ) : null}
    </div>
  );
}
