import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IncomeRecord } from "@/data/mockData";
import { rowToIncome, incomeToRow, type IncomeRow } from "@/integrations/supabase/finance-mappers";
import { incomesKey } from "./keys";

export function useFinanceIncomes(userId: string | undefined) {
  const qc = useQueryClient();
  const incomesQuery = useQuery({
    queryKey: incomesKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_incomes")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToIncome(r as unknown as IncomeRow));
    },
  });
  const incomes = incomesQuery.data ?? [];

  const upsertIncomeMutation = useMutation({
    mutationFn: async (rec: IncomeRecord) => {
      if (!userId) return;
      const row = incomeToRow(rec, userId);
      if (rec.sourceQuotationId) {
        const existing = incomes.find((x) => x.sourceQuotationId === rec.sourceQuotationId);
        if (existing) {
          const { error } = await supabase
            .from("finance_incomes")
            .update(row)
            .eq("id", existing.id);
          if (error) throw error;
          return;
        }
      }
      const { error } = await supabase.from("finance_incomes").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey(userId) }),
  });

  const updateIncomeMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<IncomeRecord> }) => {
      const existing = incomes.find((x) => x.id === id);
      if (!existing || !userId) return;
      const merged = { ...existing, ...patch };
      const row = incomeToRow(merged, userId);
      const { error } = await supabase.from("finance_incomes").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey(userId) }),
  });

  const removeIncomeBySourceMutation = useMutation({
    mutationFn: async (sourceQuotationId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("finance_incomes")
        .delete()
        .eq("source_quotation_id", sourceQuotationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey(userId) }),
  });

  const addIncomeMutation = useMutation({
    mutationFn: async (rec: Omit<IncomeRecord, "id">) => {
      if (!userId) throw new Error("Not authenticated");
      const row = incomeToRow({ ...rec, id: "" } as IncomeRecord, userId);
      const { error } = await supabase.from("finance_incomes").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: incomesKey(userId) }),
  });

  const addIncome = React.useCallback(
    (rec: Omit<IncomeRecord, "id">) => {
      addIncomeMutation.mutate(rec);
    },
    [addIncomeMutation],
  );
  const updateIncome = React.useCallback(
    (id: string, patch: Partial<IncomeRecord>) => {
      updateIncomeMutation.mutate({ id, patch });
    },
    [updateIncomeMutation],
  );
  const upsertIncomeFromQuotation = React.useCallback(
    (rec: Omit<IncomeRecord, "id"> & { sourceQuotationId: string }) => {
      upsertIncomeMutation.mutate({ ...rec, id: "" });
    },
    [upsertIncomeMutation],
  );
  const removeIncomeBySource = React.useCallback(
    (sourceQuotationId: string) => {
      removeIncomeBySourceMutation.mutate(sourceQuotationId);
    },
    [removeIncomeBySourceMutation],
  );

  return { incomes, addIncome, updateIncome, upsertIncomeFromQuotation, removeIncomeBySource };
}
