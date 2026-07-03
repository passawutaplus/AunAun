import { useState } from "react";
import { Coins, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import TopUpDialog from "./TopUpDialog";

const WalletPopover = () => {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (!user) return null;

  const welcomePx = wallet?.welcome_px ?? 0;
  const balancePx = wallet?.balance_px ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setTopUpOpen(true)}
        title={
          welcomePx > 0
            ? `เติม Pixel — ${welcomePx} px ส่งของขวัญได้`
            : "เติม Pixel"
        }
        className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full glass-chip hover:shadow-md hover:shadow-primary/20 transition-all group shrink-0"
      >
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
          <Coins className="w-3 h-3" />
        </span>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {balancePx.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground">px</span>
        {welcomePx > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium tabular-nums">
            <Gift className="w-2.5 h-2.5" />
            {welcomePx.toLocaleString()}
          </span>
        )}
      </button>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
};

export default WalletPopover;
