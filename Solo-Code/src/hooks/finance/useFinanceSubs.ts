import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Subscription } from "@/data/mockData";
import { rowToSub, subToRow, type SubRow } from "@/integrations/supabase/finance-mappers";
import { diffById, subsKey } from "./keys";

export function useFinanceSubs(userId: string | undefined) {
  const qc = useQueryClient();
  const subsQuery = useQuery({
    queryKey: subsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_subscriptions")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => rowToSub(r as unknown as SubRow));
    },
  });
  const subs = React.useMemo(() => subsQuery.data ?? [], [subsQuery.data]);

  const setSubs: React.Dispatch<React.SetStateAction<Subscription[]>> = React.useCallback(
    (next) => {
      if (!userId) return;
      const prevList = subs;
      const newList =
        typeof next === "function" ? (next as (p: Subscription[]) => Subscription[])(subs) : next;
      qc.setQueryData(subsKey(userId), newList);
      const { added, updated, removed } = diffById(subs, newList);
      (async () => {
        try {
          const ops: Promise<unknown>[] = [];
          if (removed.length) {
            ops.push(
              Promise.resolve(
                supabase
                  .from("finance_subscriptions")
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
                  .from("finance_subscriptions")
                  .insert(added.map((a) => subToRow(a, userId))),
              ).then(({ error }) => {
                if (error) throw error;
              }),
            );
          }
          for (const u of updated) {
            ops.push(
              Promise.resolve(
                supabase.from("finance_subscriptions").update(subToRow(u, userId)).eq("id", u.id),
              ).then(({ error }) => {
                if (error) throw error;
              }),
            );
          }
          await Promise.all(ops);
        } catch (e) {
          qc.setQueryData(subsKey(userId), prevList);
          toast.error(
            "บันทึก Subscription ไม่สำเร็จ: " +
              (e instanceof Error ? e.message : "ลองใหม่อีกครั้ง"),
          );
        } finally {
          qc.invalidateQueries({ queryKey: subsKey(userId) });
        }
      })();
    },
    [subs, userId, qc],
  );

  return { subs, setSubs, isLoading: subsQuery.isLoading };
}
