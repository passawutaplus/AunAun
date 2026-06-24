import { ChevronRight } from "lucide-react";
import type { FinanceSub } from "./FinanceTab";

const LABELS: Record<FinanceSub, string> = {
  pipeline: "Pipeline",
  quotations: "ใบเสนอราคา",
  jobs: "Job Tracker",
  income: "รายได้",
  tax: "ภาษี",
  subs: "Subscription",
};

export function FinanceBreadcrumb({
  sub,
  onNavigate,
}: {
  sub: FinanceSub;
  onNavigate?: (sub: FinanceSub) => void;
}) {
  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1 text-xs text-muted-foreground mb-4"
    >
      <button
        type="button"
        className="hover:text-foreground transition"
        onClick={() => onNavigate?.("pipeline")}
      >
        การเงิน
      </button>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{LABELS[sub]}</span>
    </nav>
  );
}
