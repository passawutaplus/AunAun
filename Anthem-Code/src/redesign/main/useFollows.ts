import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFollowedUserIds } from "@/hooks/useFollow";
import { setFollowing } from "@/server/mutations/follows";

const NONE = new Set<string>();

/** The people the signed-in person follows, read once for a whole list of cards, and a follow toggle. */
export function useFollows() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const key = useMemo(() => ["followed-user-ids", uid], [uid]);
  const { data } = useFollowedUserIds(uid);
  const ids = data ?? NONE;

  const { mutate } = useMutation({
    mutationFn: ({ id, follow }: { id: string; follow: boolean }) => setFollowing(uid!, id, follow),
    onMutate: async ({ id, follow }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<Set<string>>(key);
      const next = new Set(before ?? []);
      if (follow) next.add(id);
      else next.delete(id);
      qc.setQueryData(key, next);
      return { before };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: (_data, _err, { id }) => {
      for (const k of [key, ["sc-following-ids", uid], ["follow-counts", id], ["follow-counts", uid], ["is-following", id, uid], ["followers-list"], ["following-list"]]) {
        void qc.invalidateQueries({ queryKey: k });
      }
    },
  });

  const toggle = useCallback((id: string) => mutate({ id, follow: !ids.has(id) }), [mutate, ids]);
  return { signedIn: !!uid, selfId: uid ?? null, ids, toggle };
}
