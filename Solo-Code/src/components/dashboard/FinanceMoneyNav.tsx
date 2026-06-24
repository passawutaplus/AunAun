import { Coins, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceMoneySub = "income" | "tax";

type Props = {
  active: FinanceMoneySub;
  onNavigate: (sub: FinanceMoneySub) => void;
};

const ITEMS: { sub: FinanceMoneySub; label: string; icon: typeof Coins }[] = [
  { sub: "income", label: "รายได้", icon: Coins },
  { sub: "tax", label: "ภาษี", icon: Calculator },
];

export function FinanceMoneyNav({ active, onNavigate }: Props) {
  return (
    <div
      role="tablist"
      aria-label="รายได้และภาษี"
      className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1 gap-1"
    >
      {ITEMS.map(({ sub, label, icon: Icon }) => {
        const isActive = active === sub;
        return (
          <button
            key={sub}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => !isActive && onNavigate(sub)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
