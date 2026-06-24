import { useState } from "react";
import { Sparkles, Plus, Gift } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import TopUpDialog from "./TopUpDialog";

const WalletBadge = () => {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const welcomePx = wallet?.welcome_px ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={welcomePx > 0 ? `กระเป๋า Pixel — Welcome ${welcomePx} px ส่งของขวัญได้` : "กระเป๋า Pixel"}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full glass-chip hover:shadow-md hover:shadow-primary/20 transition-all group shrink-0"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground tabular-nums">
          {(wallet?.balance_px ?? 0).toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground">px</span>
        {welcomePx > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium tabular-nums ml-0.5">
            <Gift className="w-2.5 h-2.5" />
            {welcomePx.toLocaleString()}
          </span>
        )}
        <span className="ml-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="w-3 h-3" />
        </span>
      </button>
      <TopUpDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default WalletBadge;
