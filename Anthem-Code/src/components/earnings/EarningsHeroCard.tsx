import { Banknote, Coins, Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type Props = {
  netThb: number;
  earnedPx: number;
  giftablePx: number;
  lifetimeEarned: number;
  feeLabel: string;
};

export function EarningsHeroCard({ netThb, earnedPx, giftablePx, lifetimeEarned, feeLabel }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-foreground text-background p-6 shadow-lg shadow-foreground/10">
        <p className="text-xs text-background/70 font-medium">มูลค่าถอนได้โดยประมาณ</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
          ฿ {netThb.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-background/75 tabular-nums">
          จาก {earnedPx.toLocaleString()} px ที่ได้จากของขวัญ
        </p>
        <p className="mt-1 text-xs text-background/60">
          สะสมรวม {lifetimeEarned.toLocaleString()} px · หลังหักค่าธรรมเนียม {feeLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SplitCard
          icon={Coins}
          label="รายได้ถอนได้"
          value={`${earnedPx.toLocaleString()} px`}
          hint="จากผู้สนับสนุน"
          accent
        />
        <SplitCard
          icon={Sparkles}
          label="ส่งของขวัญได้"
          value={`${giftablePx.toLocaleString()} px`}
          hint="เติมเอง · ถอนไม่ได้"
        />
      </div>
    </div>
  );
}

function SplitCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl glass-panel p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className={cn("w-4 h-4", accent && "text-primary")} />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className={cn("text-xl font-semibold tabular-nums", accent && "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
