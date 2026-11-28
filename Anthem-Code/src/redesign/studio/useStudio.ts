import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { MAX_PINNED_PROJECTS, sortPortfolioProjects } from "@/lib/portfolioSort";
import { deleteWork } from "@/server/mutations/studio";
import { setWorkOrder, setWorkPinned } from "@/server/mutations/workOrder";
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

/** A work with its place on my profile (pinned first, then my order, then newest — like the profile). */
export type OrderedWork = StudioWork & { is_pinned?: boolean | null; sort_order?: number | null };
export const MAX_PINNED = MAX_PINNED_PROJECTS;
export const inProfileOrder = (works: StudioWork[]): OrderedWork[] => sortPortfolioProjects(works as OrderedWork[]);

/**
 * Pin / unpin and move my works (old ManageProjectCard): the list changes at once and goes back if the
 * server says no. A move swaps two works' places; the first move renumbers everything once (old rows
 * share sort_order 0).
 */
export function useWorkOrder(uid: string) {
  const qc = useQueryClient();
  const key = studioWorksKey(uid);
  const patch = async (f: (old: OrderedWork[]) => OrderedWork[]) => {
    await qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData<OrderedWork[]>(key);
    if (prev) qc.setQueryData(key, f(prev));
    return { prev };
  };
  const back = (ctx?: { prev?: OrderedWork[] }) => {
    if (ctx?.prev) qc.setQueryData(key, ctx.prev);
  };
  const settle = () => refreshMine(qc, uid);

  const pin = useMutation({
    mutationFn: (v: { id: string; pinned: boolean }) => setWorkPinned(v.id, v.pinned),
    onMutate: (v) => patch((old) => old.map((w) => (w.id === v.id ? { ...w, is_pinned: v.pinned } : w))),
    onError: (_e, _v, ctx) => back(ctx),
    onSettled: settle,
  });

  const reorder = useMutation({
    mutationFn: (rows: Array<{ id: string; sort_order: number }>) => setWorkOrder(rows),
    onMutate: (rows) => {
      const to = new Map(rows.map((r) => [r.id, r.sort_order]));
      return patch((old) => old.map((w) => (to.has(w.id) ? { ...w, sort_order: to.get(w.id)! } : w)));
    },
    onError: (_e, _v, ctx) => back(ctx),
    onSettled: settle,
  });

  /** One step earlier (-1) or later (1) among the pinned works, or among the others. False: nothing to move. */
  const move = (ordered: OrderedWork[], id: string, dir: -1 | 1, opts?: { onError?: () => void }) => {
    const i = ordered.findIndex((w) => w.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length || !!ordered[i].is_pinned !== !!ordered[j].is_pinned) return false;
    const values = ordered.map((w) => w.sort_order);
    const distinct = values.every((v) => v != null) && new Set(values).size === values.length;
    if (distinct) {
      reorder.mutate(
        [
          { id: ordered[i].id, sort_order: ordered[j].sort_order! },
          { id: ordered[j].id, sort_order: ordered[i].sort_order! },
        ],
        { onError: opts?.onError },
      );
    } else {
      const ids = ordered.map((w) => w.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      reorder.mutate(ids.map((wid, k) => ({ id: wid, sort_order: k })), { onError: opts?.onError });
    }
    return true;
  };

  return { pin, move, busy: pin.isPending || reorder.isPending };
}
