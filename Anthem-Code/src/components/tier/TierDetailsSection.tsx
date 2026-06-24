import { Check } from "lucide-react";
import { PlanComparisonTable } from "@/components/pricing/PlanComparisonTable";
import type { PlanId } from "@/data/plans";
import { getTierHighlights, tierLabel } from "@/lib/tierMembership";
import { cn } from "@/lib/utils";

type Props = {
  currentTier?: PlanId;
  className?: string;
  showUpgradeRow?: boolean;
  onUpgrade?: (tier: PlanId) => void;
};

export function TierDetailsSection({
  currentTier = "free",
  className,
  showUpgradeRow = true,
  onUpgrade,
}: Props) {
  const highlights = getTierHighlights(currentTier);

  return (
    <section
      id="tier-details"
      className={cn("scroll-mt-24", className)}
      aria-labelledby="tier-details-heading"
    >
      <div className="mb-8 mx-auto max-w-2xl text-center">
        <h2
          id="tier-details-heading"
          className="text-xl sm:text-2xl font-bold tracking-tight"
        >
          สิทธิ์แพ็กเกจ {tierLabel(currentTier)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          สิทธิ์ที่คุณได้รับและตารางเปรียบเทียบทุกแพ็กเกจ
        </p>
      </div>

      {highlights.length > 0 && (
        <ul className="mb-8 mx-auto max-w-xl space-y-2 rounded-2xl border border-border glass-panel p-4 sm:p-5">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground/85">{item}</span>
            </li>
          ))}
        </ul>
      )}

      <PlanComparisonTable
        currentTier={currentTier}
        showUpgradeRow={showUpgradeRow}
        onUpgrade={onUpgrade}
      />
    </section>
  );
}
