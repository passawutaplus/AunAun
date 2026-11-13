import * as React from "react";
import { IncomeTab } from "./IncomeTab";
import { QuotationsTab } from "./QuotationsTab";
import { PipelineTab } from "./PipelineTab";
import { FinanceBreadcrumb } from "./FinanceBreadcrumb";
import { QuotationsProvider } from "@/store/quotations";
import { ClientsProvider } from "@/store/clients";

export type FinanceSub = "pipeline" | "quotations" | "income";

const FINANCE_SUBS: readonly string[] = ["pipeline", "quotations", "income"];

type Props = {
  sub?: string;
  onSubChange?: (sub: FinanceSub) => void;
  onGoTab?: (tab: string, sub?: string) => void;
};

export function FinanceTab({ sub: rawSub = "quotations", onSubChange, onGoTab }: Props) {
  // Old links (e.g. sub=jobs / tax / subs from retired pages) fall back to quotations.
  const sub = (FINANCE_SUBS.includes(rawSub) ? rawSub : "quotations") as FinanceSub;
  const navigateSub = React.useCallback(
    (next: string) => {
      if (next === "pipeline" || next === "quotations" || next === "income") {
        onSubChange?.(next);
      }
    },
    [onSubChange],
  );

  const openQuotation = React.useCallback(
    (id: string) => {
      try {
        sessionStorage.setItem("so1o.openQuotationId", id);
      } catch {
        /* noop */
      }
      navigateSub("quotations");
    },
    [navigateSub],
  );

  return (
    <ClientsProvider>
      <QuotationsProvider>
        <div className="animate-fade-in">
          <FinanceBreadcrumb sub={sub} onNavigate={navigateSub} />
          {sub === "pipeline" && (
            <PipelineTab
              onNavigate={navigateSub}
              onGoTab={onGoTab}
              onOpenQuotation={openQuotation}
            />
          )}
          {sub === "quotations" && <QuotationsTab />}
          {sub === "income" && <IncomeTab />}
        </div>
      </QuotationsProvider>
    </ClientsProvider>
  );
}
