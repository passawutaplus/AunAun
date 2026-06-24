import { Check } from "lucide-react";
import { PlanComparisonTable } from "@/components/pricing/PlanComparisonTable";
import type { PlanId } from "@/data/plans";
import { getTierBenefitGroups } from "@/data/planComparison";
import { tierLabel } from "@/lib/subscriptionTiers";
import { cn } from "@/lib/utils";

type Props = {
  currentTier?: PlanId;
  className?: string;
  showUpgradeRow?: boolean;
  onUpgrade?: (tier: PlanId) => void;
  loadingTier?: PlanId | null;
};

export function TierDetailsSection({
  currentTier = "free",
  className,
  showUpgradeRow = true,
  onUpgrade,
  loadingTier,
}: Props) {
  const benefitGroups = getTierBenefitGroups(currentTier);

  return (
    <section
      id="tier-details"
      className={cn("scroll-mt-24", className)}
      aria-labelledby="tier-details-heading"
    >
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 id="tier-details-heading" className="text-xl sm:text-2xl font-bold tracking-tight">
          สิทธิ์แพ็กเกจ {tierLabel(currentTier)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          สิทธิ์ที่คุณได้รับ แบ่งตามหมวด — เปรียบเทียบกับแพ็กเกจอื่นด้านล่าง
        </p>
      </div>

      {benefitGroups.length > 0 && (
        <div className="mb-10 space-y-4 max-w-2xl mx-auto">
          {benefitGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl border border-border bg-card/60 overflow-hidden"
            >
              <div className="border-b border-border/60 bg-muted/30 px-4 sm:px-5 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.title}
                </h3>
                {group.description ? (
                  <p className="text-[11px] text-muted-foreground/90 mt-0.5 normal-case tracking-normal">
                    {group.description}
                  </p>
                ) : null}
              </div>
              <ul className="px-4 sm:px-5 py-4 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <PlanComparisonTable
        currentTier={currentTier}
        showUpgradeRow={showUpgradeRow}
        onUpgrade={onUpgrade}
        loadingTier={loadingTier}
      />
    </section>
  );
}
