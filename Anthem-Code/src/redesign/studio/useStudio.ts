import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { deleteWork } from "@/server/mutations/studio";
import { getStudioProfile, getStudioWorks, type StudioWork } from "@/server/queries/studio";

const STALE = 30_000;

export const studioWorksKey = (uid: string | undefined) => ["sc-studio-works", uid];

export function useStudioWorks(uid: string | undefined) {
  return useQuery({ queryKey: studioWorksKey(uid), queryFn: () => getStudioWorks(uid!), enabled: !!uid, staleTime: STALE });
}

export function useStudioProfile(uid: string | undefined) {
  return useQuery({ queryKey: ["sc-studio-profile", uid], queryFn: () => getStudioProfile(uid!), enabled: !!uid, staleTime: STALE });
}

/** Everything that shows my profile or my works, refreshed after a change in the Studio. */
export function refreshMine(qc: QueryClient, uid: string) {
  for (const key of [
    ["sc-studio-profile", uid],
    ["sc-studio-works", uid],
    ["sc-my-profile", uid],
    ["sc-my-works", uid],
    ["sc-my-catalogs", uid],
    ["sc-profile"],
    ["sc-profile-works", uid],
    ["sc-profile-catalogs", uid],
    ["sc-showcase"],
    ["sc-creators"],
    ["sc-onboarding"],
    ["profile", uid],
    ["my-projects"],
  ]) {
    void qc.invalidateQueries({ queryKey: key });
  }
}

/** Delete one of my works: gone from the list at once, back if the server says no. */
export function useDeleteWork(uid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWork(id),
    onMutate: async (id) => {
      const key = studioWorksKey(uid);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<StudioWork[]>(key);
      if (prev) qc.setQueryData(key, prev.filter((w) => w.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(studioWorksKey(uid), ctx.prev);
    },
    onSettled: () => refreshMine(qc, uid),
  });
}
