import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useQuotations, computeTotals, type Quotation } from "@/store/quotations";
import { useFinance } from "@/store/finance";
import {
  derivePipelineColumn,
  isPipelineExcluded,
  type PipelineColumn,
  type PipelineJobContext,
} from "@/lib/pipelineStatus";

export interface PipelineDeal {
  quotation: Quotation;
  column: PipelineColumn;
  grandTotal: number;
  job?: PipelineJobContext;
  hasIncome: boolean;
  incomeGross?: number;
}

const KEY = (uid?: string) => ["pipeline_deals", uid ?? "anon"] as const;

export function usePipelineDeals() {
  const { user } = useAuth();
  const uid = user?.id;
  const { list: quotations, isLoading: quotesLoading } = useQuotations();
  const finance = useFinance();

  const jobsQuery = useQuery({
    queryKey: [...KEY(uid), "jobs"],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_trackers")
        .select("id, quotation_id, current_step, share_token, deposit_paid, final_paid");
      if (error) throw error;
      return data ?? [];
    },
  });

  const slipsQuery = useQuery({
    queryKey: [...KEY(uid), "slips"],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_slips")
        .select("job_id, verified, rejected")
        .eq("verified", false)
        .eq("rejected", false);
      if (error) throw error;
      return data ?? [];
    },
  });

  const jobsByQuote = new Map<string, PipelineJobContext>();
  const pendingSlipsByJob = new Map<string, number>();

  for (const s of slipsQuery.data ?? []) {
    pendingSlipsByJob.set(s.job_id, (pendingSlipsByJob.get(s.job_id) ?? 0) + 1);
  }

  for (const j of jobsQuery.data ?? []) {
    if (!j.quotation_id) continue;
    jobsByQuote.set(j.quotation_id, {
      id: j.id,
      currentStep: j.current_step ?? 0,
      shareToken: j.share_token,
      depositPaid: !!j.deposit_paid,
      finalPaid: !!j.final_paid,
      pendingSlips: pendingSlipsByJob.get(j.id) ?? 0,
    });
  }

  const incomeByQuote = new Map<string, { id: string; gross: number }>();
  for (const inc of finance.incomes) {
    if (inc.sourceQuotationId) {
      incomeByQuote.set(inc.sourceQuotationId, { id: inc.id, gross: inc.gross ?? 0 });
    }
  }

  const deals: PipelineDeal[] = quotations
    .filter((q) => !isPipelineExcluded(q.status))
    .map((q) => {
      const job = jobsByQuote.get(q.id);
      const income = incomeByQuote.get(q.id);
      const totals = computeTotals(q);
      return {
        quotation: q,
        column: derivePipelineColumn(q, job, income),
        grandTotal: totals.grandTotal,
        job,
        hasIncome: !!income,
        incomeGross: income?.gross,
      };
    })
    .sort((a, b) => b.quotation.updatedAt.localeCompare(a.quotation.updatedAt));

  const byColumn = (col: PipelineColumn) => deals.filter((d) => d.column === col);

  return {
    deals,
    byColumn,
    isLoading: quotesLoading || jobsQuery.isLoading,
    refetch: () => {
      jobsQuery.refetch();
      slipsQuery.refetch();
    },
  };
}

export function useInvalidatePipeline() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => qc.invalidateQueries({ queryKey: KEY(user?.id) });
}
