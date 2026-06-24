import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { settingsKey } from "./keys";

export function useFinanceSettings(userId: string | undefined) {
  const qc = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: settingsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const expenseMethod: "lumpsum" | "actual" =
    (settingsQuery.data?.expense_method as "lumpsum" | "actual") ?? "lumpsum";
  const monthlyGoal: number = Number(settingsQuery.data?.monthly_goal ?? 0);

  const upsertSettings = useMutation({
    mutationFn: async (patch: { expense_method?: string; monthly_goal?: number }) => {
      if (!userId) return;
      const existing = settingsQuery.data;
      if (existing) {
        const { error } = await supabase
          .from("finance_settings")
          .update(patch)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("finance_settings")
          .insert({ user_id: userId, ...patch });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKey(userId) }),
  });

  const setExpenseMethod: React.Dispatch<React.SetStateAction<"lumpsum" | "actual">> =
    React.useCallback(
      (next) => {
        const value = typeof next === "function" ? next(expenseMethod) : next;
        upsertSettings.mutate({ expense_method: value });
      },
      [expenseMethod, upsertSettings],
    );

  const setMonthlyGoal = React.useCallback(
    (goal: number) => {
      upsertSettings.mutate({ monthly_goal: Math.max(0, Math.round(goal)) });
    },
    [upsertSettings],
  );

  return { expenseMethod, setExpenseMethod, monthlyGoal, setMonthlyGoal };
}
