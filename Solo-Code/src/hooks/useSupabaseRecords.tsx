import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

/**
 * useSupabaseRecords — generic persistence hook
 *
 * Returns a `[items, setItems]` pair compatible with React.useState semantics
 * but backed by a Supabase table. On every set call, it diffs the new list
 * against the previous one (by `id`) and pushes added/updated/removed rows
 * to the database in the background. The list is fetched on mount and
 * refetched after each mutation finishes.
 *
 * Designed to replace `useLocalStorageState` / `React.useState<T[]>` without
 * forcing components to know about TanStack Query or Supabase queries.
 */
export type RecordWithId = { id: string };

type Options<TItem extends RecordWithId, TRow> = {
  table: string;
  /** Stable key for the React Query cache. */
  cacheKey: string;
  /** Convert a DB row into an app item. */
  fromRow: (row: TRow) => TItem;
  /** Convert an app item into the row shape used for insert/update. */
  toRow: (item: TItem, userId: string) => Record<string, unknown>;
  /** Optional extra `select(...)` columns. Defaults to `*`. */
  select?: string;
  /** Optional ordering, e.g. `created_at` ASC. */
  orderBy?: { column: string; ascending?: boolean };
  /** Extra filter applied to every query (e.g. kind = 'font'). */
  filterEq?: { column: string; value: string };
};

export function useSupabaseRecords<TItem extends RecordWithId, TRow>(opts: Options<TItem, TRow>) {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const queryKey = React.useMemo(
    () => [opts.cacheKey, userId ?? "anon"] as const,
    [opts.cacheKey, userId],
  );

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase.from(opts.table as never).select(opts.select ?? "*");
      if (opts.filterEq) {
        q = q.eq(opts.filterEq.column, opts.filterEq.value);
      }
      if (opts.orderBy) {
        q = q.order(opts.orderBy.column, { ascending: opts.orderBy.ascending ?? true });
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as TRow[]).map(opts.fromRow);
    },
  });

  const items = React.useMemo(() => query.data ?? [], [query.data]);

  const setItems = React.useCallback<React.Dispatch<React.SetStateAction<TItem[]>>>(
    (next) => {
      if (!userId) return;
      const prev = items;
      const newList = typeof next === "function" ? (next as (p: TItem[]) => TItem[])(prev) : next;
      // optimistic
      qc.setQueryData(queryKey, newList);

      const prevMap = new Map(prev.map((x) => [x.id, x]));
      const nextMap = new Map(newList.map((x) => [x.id, x]));
      const added: TItem[] = [];
      const updated: TItem[] = [];
      const removed: TItem[] = [];
      for (const [id, item] of nextMap) {
        const old = prevMap.get(id);
        if (!old) added.push(item);
        else if (JSON.stringify(old) !== JSON.stringify(item)) updated.push(item);
      }
      for (const [id, item] of prevMap) {
        if (!nextMap.has(id)) removed.push(item);
      }

      (async () => {
        try {
          if (removed.length) {
            await supabase
              .from(opts.table as never)
              .delete()
              .in(
                "id",
                removed.map((x) => x.id),
              );
          }
          for (const a of added) {
            await supabase.from(opts.table as never).insert(opts.toRow(a, userId) as never);
          }
          for (const u of updated) {
            await supabase
              .from(opts.table as never)
              .update(opts.toRow(u, userId) as never)
              .eq("id", u.id);
          }
        } finally {
          qc.invalidateQueries({ queryKey });
        }
      })();
    },
    [items, userId, qc, queryKey, opts],
  );

  return {
    items,
    setItems,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
