import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { setWorkSaved } from "@/server/mutations/workSaves";
import { getSavedWorkIds } from "@/server/queries/showcase";

/**
 * Saved works of the signed-in person (table project_bookmarks), read once for the whole grid.
 * Putting a saved work into a collection comes with SaveToast (Work step).
 */
export function useWorkSaves() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const key = useMemo(() => ["sc-saved-work-ids", uid], [uid]);

  const { data } = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: () => getSavedWorkIds(uid!),
  });

  const mutation = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => setWorkSaved(uid!, id, !saved),
    onMutate: async ({ id, saved }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (old = []) => (saved ? old.filter((x) => x !== id) : [...old, id]));
      return { before };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: (_data, _err, { id }) => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["bookmarked-projects", uid] });
      void qc.invalidateQueries({ queryKey: ["project-bookmarked", id, uid] });
    },
  });

  const ids = useMemo(() => new Set(data ?? []), [data]);
  const { mutate } = mutation;
  const toggle = useCallback((id: string) => mutate({ id, saved: ids.has(id) }), [mutate, ids]);

  return { signedIn: !!uid, ids, toggle };
}
