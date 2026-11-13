import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useQuotations, computeTotals, type Quotation } from "@/store/quotations";
import { useFinance } from "@/store/finance";
import {
  derivePipelineColumn,
  isPipelineExcluded,
  type PipelineColumn,
} from "@/lib/pipelineStatus";

export interface PipelineDeal {
  quotation: Quotation;
  column: PipelineColumn;
  grandTotal: number;
  hasIncome: boolean;
  incomeGross?: number;
}

const KEY = (uid?: string) => ["pipeline_deals", uid ?? "anon"] as const;

export function usePipelineDeals() {
  const { list: quotations, isLoading: quotesLoading } = useQuotations();
  const finance = useFinance();

  const incomeByQuote = new Map<string, { id: string; gross: number }>();
  for (const inc of finance.incomes) {
    if (inc.sourceQuotationId) {
      incomeByQuote.set(inc.sourceQuotationId, { id: inc.id, gross: inc.gross ?? 0 });
    }
  }

  const deals: PipelineDeal[] = quotations
    .filter((q) => !isPipelineExcluded(q.status))
    .map((q) => {
      const income = incomeByQuote.get(q.id);
      const totals = computeTotals(q);
      return {
        quotation: q,
        column: derivePipelineColumn(q, income),
        grandTotal: totals.grandTotal,
        hasIncome: !!income,
        incomeGross: income?.gross,
      };
    })
    .sort((a, b) => b.quotation.updatedAt.localeCompare(a.quotation.updatedAt));

  const byColumn = (col: PipelineColumn) => deals.filter((d) => d.column === col);

  return {
    deals,
    byColumn,
    isLoading: quotesLoading,
    refetch: () => {},
  };
}

export function useInvalidatePipeline() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => qc.invalidateQueries({ queryKey: KEY(user?.id) });
}
