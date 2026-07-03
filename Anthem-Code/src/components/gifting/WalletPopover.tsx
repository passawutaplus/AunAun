import { useState } from "react";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, useAvailablePurchasedPx } from "@/hooks/useWallet";
import { computeGiftablePx, computeWalletTotalPx } from "@/lib/walletDisplay";
import TopUpDialog from "./TopUpDialog";

const WalletPopover = () => {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const { data: purchasedAvailable } = useAvailablePurchasedPx();
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (!user) return null;

  const totalPx = computeWalletTotalPx(wallet);
  const giftable = computeGiftablePx(wallet, purchasedAvailable);

  return (
    <>
      <button
        type="button"
        onClick={() => setTopUpOpen(true)}
        title={`กระเป๋า ${totalPx.toLocaleString()} px · ส่งของขวัญได้ ${giftable.toLocaleString()} px`}
        className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full glass-chip hover:shadow-md hover:shadow-primary/20 transition-all group shrink-0"
      >
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
          <Coins className="w-3 h-3" />
        </span>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {totalPx.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground">px</span>
      </button>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
};

export default WalletPopover;
