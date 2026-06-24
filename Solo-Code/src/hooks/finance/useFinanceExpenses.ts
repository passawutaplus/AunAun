import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExpenseRecord } from "@/data/mockData";
import { rowToExp, expToRow, type ExpRow } from "@/integrations/supabase/finance-mappers";
import { diffById, expKey } from "./keys";

export function useFinanceExpenses(userId: string | undefined) {
  const qc = useQueryClient();
  const expensesQuery = useQuery({
    queryKey: expKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_expenses")
        .select("*")
        .order("spent_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToExp(r as unknown as ExpRow));
    },
  });
  const allExpenses = expensesQuery.data ?? [];
  const workExpenses = React.useMemo(
    () => allExpenses.filter((e) => e.category === "work"),
    [allExpenses],
  );
  const personalExpenses = React.useMemo(
    () => allExpenses.filter((e) => e.category === "personal"),
    [allExpenses],
  );

  function makeExpenseSetter(
    scope: "work" | "personal",
  ): React.Dispatch<React.SetStateAction<ExpenseRecord[]>> {
    return (next) => {
      if (!userId) return;
      const current = scope === "work" ? workExpenses : personalExpenses;
      const prevCombined = allExpenses;
      const newList =
        typeof next === "function"
          ? (next as (p: ExpenseRecord[]) => ExpenseRecord[])(current)
          : next;
      const combined =
        scope === "work" ? [...newList, ...personalExpenses] : [...workExpenses, ...newList];
      qc.setQueryData(expKey(userId), combined);
      const { added, updated, removed } = diffById(current, newList);
      (async () => {
        try {
          const ops: Promise<unknown>[] = [];
          if (removed.length) {
            ops.push(
              Promise.resolve(
                supabase
                  .from("finance_expenses")
                  .delete()
                  .in(
                    "id",
                    removed.map((x) => x.id),
                  ),
              ).then(({ error }) => {
                if (error) throw error;
              }),
            );
          }
          if (added.length) {
            ops.push(
              Promise.resolve(
                supabase
                  .from("finance_expenses")
                  .insert(added.map((a) => expToRow(a, userId, scope))),
              ).then(({ error }) => {
                if (error) throw error;
              }),
            );
          }
          for (const u of updated) {
            ops.push(
              Promise.resolve(
                supabase
                  .from("finance_expenses")
                  .update(expToRow(u, userId, scope))
                  .eq("id", u.id),
              ).then(({ error }) => {
                if (error) throw error;
              }),
            );
          }
          await Promise.all(ops);
        } catch (e) {
          qc.setQueryData(expKey(userId), prevCombined);
          toast.error(
            "บันทึกรายจ่ายไม่สำเร็จ: " + (e instanceof Error ? e.message : "ลองใหม่อีกครั้ง"),
          );
        } finally {
          qc.invalidateQueries({ queryKey: expKey(userId) });
        }
      })();
    };
  }

  const setWorkExpenses = React.useMemo(
    () => makeExpenseSetter("work"),
    [workExpenses, personalExpenses, userId],
  );
  const setPersonalExpenses = React.useMemo(
    () => makeExpenseSetter("personal"),
    [workExpenses, personalExpenses, userId],
  );

  return {
    workExpenses,
    personalExpenses,
    setWorkExpenses,
    setPersonalExpenses,
    isLoading: expensesQuery.isLoading,
  };
}
