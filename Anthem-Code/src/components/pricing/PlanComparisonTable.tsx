import { Check, ExternalLink, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PLAN_COMPARISON_ROWS,
  PLAN_COMPARISON_TIER_LABELS,
  PLAN_COMPARISON_TIER_ORDER,
  type ComparisonCell,
} from "@/data/planComparison";
import type { PlanId } from "@/data/plans";
import { TIER_RANK } from "@/lib/tierMembership";
import { SO1O_PRICING_URL } from "@/lib/productLinks";
import { cn } from "@/lib/utils";

function ComparisonCellValue({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return <Check className="h-4 w-4 text-primary mx-auto" aria-label="มี" />;
  }
  if (value === false) {
    return <Minus className="h-4 w-4 text-muted-foreground/50 mx-auto" aria-label="ไม่มี" />;
  }
  if (value === "coming_soon") {
    return (
      <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
        เร็วๆ นี้
      </Badge>
    );
  }
  return <span className="text-foreground/90">{value}</span>;
}

function UpgradeCell({
  tier,
  currentTier,
  onUpgrade,
}: {
  tier: PlanId;
  currentTier?: PlanId;
  onUpgrade?: (tier: PlanId) => void;
}) {
  if (!currentTier) {
    if (tier === "free") {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs px-3">
        <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer">
          เลือกแพ็ก
        </a>
      </Button>
    );
  }

  if (tier === currentTier) {
    return (
      <Badge variant="secondary" className="text-[10px] font-medium">
        ปัจจุบัน
      </Badge>
    );
  }

  if (TIER_RANK[tier] < TIER_RANK[currentTier] || tier === "free") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (onUpgrade) {
    return (
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1 rounded-full text-xs px-3"
        onClick={() => onUpgrade(tier)}
      >
        อัพเกรด
        <ExternalLink className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <Button asChild size="sm" className="h-8 gap-1 rounded-full text-xs px-3">
      <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer">
        อัพเกรด
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}

type Props = {
  currentTier?: PlanId;
  className?: string;
  showUpgradeRow?: boolean;
  onUpgrade?: (tier: PlanId) => void;
};

export function PlanComparisonTable({
  currentTier,
  className,
  showUpgradeRow = false,
  onUpgrade,
}: Props) {
  return (
    <section className={cn("max-w-6xl mx-auto", className)}>
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">เปรียบเทียบแพ็กเกจ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ดูความแตกต่างของ Free, Pro, Pro+ และ In-House ในที่เดียว
        </p>
      </div>

      <Card className="overflow-hidden border border-border glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th
                  scope="col"
                  className="text-left font-semibold px-4 sm:px-5 py-3 text-muted-foreground w-[28%]"
                >
                  หมวด
                </th>
                {PLAN_COMPARISON_TIER_ORDER.map((tier) => (
                  <th
                    key={tier}
                    scope="col"
                    className={cn(
                      "text-center font-semibold px-3 py-3 min-w-[88px]",
                      currentTier === tier && "bg-primary/10 text-primary",
                    )}
                  >
                    {PLAN_COMPARISON_TIER_LABELS[tier]}
                    {currentTier === tier && (
                      <span className="block text-[10px] font-normal text-primary/80 mt-0.5">
                        ปัจจุบัน
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row, idx) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-border last:border-0",
                    idx % 2 === 1 && "bg-muted/20",
                  )}
                >
                  <th
                    scope="row"
                    className="text-left font-medium px-4 sm:px-5 py-3 text-foreground/90"
                  >
                    {row.label}
                  </th>
                  {PLAN_COMPARISON_TIER_ORDER.map((tier) => (
                    <td
                      key={tier}
                      className={cn(
                        "text-center px-3 py-3 tabular-nums",
                        currentTier === tier && "bg-primary/5",
                      )}
                    >
                      <ComparisonCellValue value={row.values[tier]} />
                    </td>
                  ))}
                </tr>
              ))}
              {showUpgradeRow && (
                <tr className="border-t border-border bg-muted/30">
                  <th
                    scope="row"
                    className="text-left font-medium px-4 sm:px-5 py-4 text-foreground/90"
                  >
                    อัพเกรด
                  </th>
                  {PLAN_COMPARISON_TIER_ORDER.map((tier) => (
                    <td
                      key={tier}
                      className={cn(
                        "text-center px-3 py-4",
                        currentTier === tier && "bg-primary/5",
                      )}
                    >
                      <UpgradeCell
                        tier={tier}
                        currentTier={currentTier}
                        onUpgrade={onUpgrade}
                      />
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
