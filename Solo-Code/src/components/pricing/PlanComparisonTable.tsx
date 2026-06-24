import * as React from "react";
import { Check, Info, Loader2, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  PLAN_COMPARISON_CATEGORIES,
  PLAN_COMPARISON_TIER_LABELS,
  PLAN_COMPARISON_TIER_ORDER,
  type ComparisonCell,
} from "@/data/planComparison";
import type { PlanId } from "@/data/plans";
import { TIER_RANK } from "@/lib/tierMembership";
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

function CategoryInfoTip({ title, text }: { title: string; text: string }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-muted-foreground/55 hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 align-middle"
          aria-label={`ข้อมูลหมวด ${title}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-64 p-3 text-xs leading-relaxed text-popover-foreground"
      >
        {text}
      </HoverCardContent>
    </HoverCard>
  );
}

function UpgradeCell({
  tier,
  currentTier,
  onUpgrade,
  loadingTier,
}: {
  tier: PlanId;
  currentTier?: PlanId;
  onUpgrade?: (tier: PlanId) => void;
  loadingTier?: PlanId | null;
}) {
  if (!currentTier) {
    if (tier === "free") {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-full text-xs px-3"
        onClick={() => onUpgrade?.(tier)}
        disabled={!onUpgrade || loadingTier === tier}
      >
        {loadingTier === tier ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "เลือกแพ็ก"}
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

  if (TIER_RANK[tier] < TIER_RANK[currentTier]) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (tier === "free") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Button
      type="button"
      size="sm"
      className="h-8 rounded-full text-xs px-3"
      onClick={() => onUpgrade?.(tier)}
      disabled={!onUpgrade || loadingTier === tier}
    >
      {loadingTier === tier ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "อัพเกรด"}
    </Button>
  );
}

type Props = {
  currentTier?: PlanId;
  className?: string;
  showUpgradeRow?: boolean;
  onUpgrade?: (tier: PlanId) => void;
  loadingTier?: PlanId | null;
};

export function PlanComparisonTable({
  currentTier,
  className,
  showUpgradeRow = false,
  onUpgrade,
  loadingTier,
}: Props) {
  const colCount = 1 + PLAN_COMPARISON_TIER_ORDER.length;

  return (
    <section className={cn("max-w-6xl mx-auto", className)}>
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">เปรียบเทียบแพ็กเกจ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          แบ่งตามหมวด — ดูความแตกต่าง Free, Pro, Pro+ และ In-House ในที่เดียว
        </p>
      </div>

      <Card className="overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th
                  scope="col"
                  className="text-left font-semibold px-4 sm:px-5 py-3 text-muted-foreground w-[28%]"
                >
                  รายการ
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
              {PLAN_COMPARISON_CATEGORIES.map((category) => (
                <React.Fragment key={category.id}>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      scope="colgroup"
                      colSpan={colCount}
                      className="text-left px-4 sm:px-5 py-2.5"
                    >
                      <div className="inline-flex items-center gap-1 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {category.title}
                        </span>
                        {category.info ? (
                          <CategoryInfoTip title={category.title} text={category.info} />
                        ) : null}
                      </div>
                      {category.description ? (
                        <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80 mt-0.5">
                          {category.description}
                        </span>
                      ) : null}
                    </th>
                  </tr>
                  {category.rows.map((row, idx) => (
                    <tr
                      key={`${category.id}-${row.label}`}
                      className={cn(
                        "border-b border-border/70 last:border-0",
                        idx % 2 === 1 && "bg-muted/15",
                      )}
                    >
                      <th
                        scope="row"
                        className="text-left font-medium px-4 sm:px-5 py-3 pl-6 sm:pl-7 text-foreground/90"
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
                </React.Fragment>
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
                        loadingTier={loadingTier}
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
