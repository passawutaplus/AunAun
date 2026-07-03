import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { useWallet, useAvailablePx } from "@/hooks/useWallet";
import { PIXEL_POLICY_PATH } from "@/lib/pixelPolicy";

const fmt = (n: number) => n.toLocaleString();

const WalletBalanceSummary = () => {
  const { data: wallet } = useWallet();
  const { data: giftable = 0 } = useAvailablePx();

  const welcomePx = wallet?.welcome_px ?? 0;
  const balancePx = wallet?.balance_px ?? 0;
  const earnedPx = wallet?.earned_px ?? 0;
  const totalPx = welcomePx + balancePx;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          กระเป๋า Pixel
        </p>
        <Link
          to={PIXEL_POLICY_PATH}
          className="text-[10px] text-primary hover:underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          นโยบาย Pixel
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">ยอดรวมในกระเป๋า</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              ส่งของขวัญได้ {fmt(giftable)} px
              {earnedPx > 0 && <> · ถอนได้ {fmt(earnedPx)} px</>}
            </p>
          </div>
        </div>
        <p className="text-xl font-bold tabular-nums shrink-0">
          {fmt(totalPx)}{" "}
          <span className="text-sm font-medium text-muted-foreground">px</span>
        </p>
      </div>
    </section>
  );
};

export default WalletBalanceSummary;
