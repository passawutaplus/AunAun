import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PaymentMethod } from "@/data/mockData";
import { rowToPm, pmToRow, type PmRow } from "@/integrations/supabase/finance-mappers";
import { diffById, pmKey } from "./keys";

export function useFinancePaymentMethods(userId: string | undefined) {
  const qc = useQueryClient();
  const pmQuery = useQuery({
    queryKey: pmKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_payment_methods")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => rowToPm(r as unknown as PmRow));
    },
  });
  const paymentMethods = React.useMemo(() => pmQuery.data ?? [], [pmQuery.data]);

  const setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>> =
    React.useCallback(
      (next) => {
        if (!userId) return;
        const prevList = paymentMethods;
        const newList =
          typeof next === "function"
            ? (next as (p: PaymentMethod[]) => PaymentMethod[])(paymentMethods)
            : next;
        qc.setQueryData(pmKey(userId), newList);
        const { added, updated, removed } = diffById(paymentMethods, newList);
        (async () => {
          try {
            const ops: Promise<unknown>[] = [];
            if (removed.length) {
              ops.push(
                Promise.resolve(
                  supabase
                    .from("finance_payment_methods")
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
                    .from("finance_payment_methods")
                    .insert(added.map((a) => pmToRow(a, userId))),
                ).then(({ error }) => {
                  if (error) throw error;
                }),
              );
            }
            for (const u of updated) {
              ops.push(
                Promise.resolve(
                  supabase
                    .from("finance_payment_methods")
                    .update(pmToRow(u, userId))
                    .eq("id", u.id),
                ).then(({ error }) => {
                  if (error) throw error;
                }),
              );
            }
            await Promise.all(ops);
          } catch (e) {
            qc.setQueryData(pmKey(userId), prevList);
            toast.error(
              "บันทึกวิธีชำระเงินไม่สำเร็จ: " +
                (e instanceof Error ? e.message : "ลองใหม่อีกครั้ง"),
            );
          } finally {
            qc.invalidateQueries({ queryKey: pmKey(userId) });
          }
        })();
      },
      [paymentMethods, userId, qc],
    );

  return { paymentMethods, setPaymentMethods, isLoading: pmQuery.isLoading };
}
