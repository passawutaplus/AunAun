import { useNavigate } from "react-router-dom";
import { ArrowRight, Coins } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { computeWalletTotalPx } from "@/lib/walletDisplay";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString();

type Props = {
  className?: string;
};

const ProfileWalletCard = ({ className }: Props) => {
  const navigate = useNavigate();
  const { data: wallet, isLoading } = useWallet();
  const totalPx = computeWalletTotalPx(wallet);

  return (
    <button
      type="button"
      onClick={() => navigate("/earnings")}
      className={cn(
        "w-full text-left rounded-3xl glass-panel p-4 transition-colors",
        "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      aria-label="รายได้และกระเป๋า Pixel"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            กระเป๋า Pixel
          </p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 rounded-lg bg-muted/60 animate-pulse" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {fmt(totalPx)}{" "}
              <span className="text-sm font-medium text-muted-foreground">px</span>
            </p>
          )}
        </div>
        <span className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Coins className="w-4 h-4 text-primary" />
        </span>
      </div>

      <p className="mt-3 flex items-center justify-between gap-2 text-xs font-medium text-primary">
        <span>รายได้ &amp; กระเป๋า</span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
      </p>
    </button>
  );
};

export default ProfileWalletCard;
