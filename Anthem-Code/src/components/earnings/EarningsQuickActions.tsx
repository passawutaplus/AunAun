import { Banknote, Coins, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onTopUp: () => void;
  onCashout: () => void;
  onReferral: () => void;
  canCashout: boolean;
  cashoutHint?: string;
};

type QuickAction = {
  id: string;
  label: string;
  icon: typeof Coins;
  onClick: () => void;
  disabled: boolean;
  hint?: string;
};

export function EarningsQuickActions({
  onTopUp,
  onCashout,
  onReferral,
  canCashout,
  cashoutHint,
}: Props) {
  const actions: QuickAction[] = [
    { id: "topup", label: "เติม Pixel", icon: Coins, onClick: onTopUp, disabled: false },
    {
      id: "cashout",
      label: "ถอนเงิน",
      icon: Banknote,
      onClick: onCashout,
      disabled: !canCashout,
      hint: cashoutHint,
    },
    { id: "referral", label: "ชวนเพื่อน", icon: UserPlus, onClick: onReferral, disabled: false },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ id, label, icon: Icon, onClick, disabled, hint }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={disabled ? hint : label}
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl glass-panel p-4 min-h-[88px] transition-colors",
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-accent/60 active:scale-[0.98]",
          )}
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              id === "cashout" && canCashout
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="w-5 h-5" />
          </span>
          <span className="text-xs font-medium text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}
