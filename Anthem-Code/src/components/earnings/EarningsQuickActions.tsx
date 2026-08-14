import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onTopUp: () => void;
  /** Top-up is part of gift economy — hide when gifts are paused. */
  showTopUp?: boolean;
};

export function EarningsQuickActions({ onTopUp, showTopUp = true }: Props) {
  if (!showTopUp) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:max-w-xs">
      <button
        type="button"
        onClick={onTopUp}
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl glass-panel px-4 py-3",
          "hover:bg-accent/60 active:scale-[0.98] transition-colors",
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Coins className="w-4 h-4" />
        </span>
        <span className="text-xs font-medium text-foreground">เติม Pixel</span>
      </button>
    </div>
  );
}
