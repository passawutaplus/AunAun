import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deductionsKey } from "./keys";

export function useFinanceDeductions(userId: string | undefined) {
  const qc = useQueryClient();
  const deductionsQuery = useQuery({
    queryKey: deductionsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_deductions").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const deductionsRows = deductionsQuery.data ?? [];

  const deductions = React.useMemo<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    deductionsRows.forEach((d) => {
      out[d.deduction_key] = d.enabled;
    });
    return out;
  }, [deductionsRows]);

  const deductionAmounts = React.useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    deductionsRows.forEach((d) => {
      out[d.deduction_key] = Number(d.amount ?? 0);
    });
    return out;
  }, [deductionsRows]);

  const deductionNotes = React.useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    deductionsRows.forEach((d) => {
      if (d.note) out[d.deduction_key] = d.note;
    });
    return out;
  }, [deductionsRows]);

  const upsertDeduction = useMutation({
    mutationFn: async (rec: { key: string; enabled?: boolean; amount?: number; note?: string }) => {
      if (!userId) return;
      const existing = deductionsRows.find((d) => d.deduction_key === rec.key);
      const payload = {
        user_id: userId,
        deduction_key: rec.key,
        enabled: rec.enabled ?? existing?.enabled ?? false,
        amount: rec.amount ?? Number(existing?.amount ?? 0),
        note: rec.note ?? existing?.note ?? null,
      };
      if (existing) {
        const { error } = await supabase
          .from("finance_deductions")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finance_deductions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: deductionsKey(userId) }),
  });

  const toggleDeduction = React.useCallback(
    (key: string) => {
      upsertDeduction.mutate({ key, enabled: !deductions[key] });
    },
    [deductions, upsertDeduction],
  );
  const setDeductionAmount = React.useCallback(
    (key: string, amount: number) => {
      upsertDeduction.mutate({ key, amount: Math.max(0, amount) });
    },
    [upsertDeduction],
  );
  const setDeductionNote = React.useCallback(
    (key: string, note: string) => {
      upsertDeduction.mutate({ key, note });
    },
    [upsertDeduction],
  );

  return {
    deductions,
    deductionAmounts,
    deductionNotes,
    toggleDeduction,
    setDeductionAmount,
    setDeductionNote,
  };
}
