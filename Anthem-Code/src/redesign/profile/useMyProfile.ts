import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import { setVisibilitySwitch } from "@/server/mutations/account";
import { toggleEventInterest } from "@/server/mutations/eventInterest";
import {
  addToCollection,
  createCollectionWith,
  deleteCollection,
  removeFromCollection,
  renameCollection,
  reorderCollection,
  setCatalogPublic,
  setCollectionPublic,
  setWorkLocked,
  unsaveWorks,
} from "@/server/mutations/myProfile";
import { getMyVisibility } from "@/server/queries/account";
import {
  getFollowingCards,
  getMyCatalogs,
  getMyCollections,
  getMyFollowingIds,
  getMyInterestedIds,
  getMyProfile,
  getMySavedIds,
  getMyWorks,
  type MyCatalog,
  type MyCollection,
  type MyWorkRow,
} from "@/server/queries/myProfile";
import { getEventsByIds, getHostedEvents, getWorksByIds, type ProfileEventRow } from "@/server/queries/profilePage";

const STALE = 60_000;

/** Optimistic change of one cached list; puts the old list back if the server says no. */
function useListMutation<T, V>(key: QueryKey, run: (v: V) => Promise<unknown>, apply: (old: T, v: V) => T, also: QueryKey[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<T>(key);
      if (before !== undefined) qc.setQueryData<T>(key, apply(before, v));
      return { before };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.before !== undefined) qc.setQueryData(key, ctx.before);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      for (const k of also) void qc.invalidateQueries({ queryKey: k });
    },
  });
}

export function useMyProfile(uid: string | undefined) {
  return useQuery({ queryKey: ["sc-my-profile", uid], queryFn: () => getMyProfile(uid!), enabled: !!uid, staleTime: STALE });
}

/** Own Published + Private works, and the globe/lock on each. */
export function useMyWorks(uid: string | undefined) {
  const key = ["sc-my-works", uid];
  const q = useQuery({ queryKey: key, queryFn: () => getMyWorks(uid!), enabled: !!uid, staleTime: STALE });
  const lock = useListMutation<MyWorkRow[], { id: string; locked: boolean }>(
    key,
    ({ id, locked }) => setWorkLocked(id, locked),
    (old, { id, locked }) => old.map((w) => (w.id === id ? { ...w, status: locked ? "Private" : "Published" } : w)),
    [["sc-profile-works", uid], ["sc-showcase"]],
  );
  return { q, lock };
}

export function useMyCatalogs(uid: string | undefined) {
  const key = ["sc-my-catalogs", uid];
  const q = useQuery({ queryKey: key, queryFn: () => getMyCatalogs(uid!), enabled: !!uid, staleTime: STALE });
  const setPublic = useListMutation<MyCatalog[], { id: string; isPublic: boolean }>(
    key,
    ({ id, isPublic }) => setCatalogPublic(id, isPublic),
    (old, { id, isPublic }) => old.map((c) => (c.id === id ? { ...c, isPublic } : c)),
    [["sc-profile-catalogs", uid]],
  );
  return { q, setPublic };
}

/** People I follow, as cards (read when the Following tab opens; follow toggles do not drop a card until next visit). */
export function useMyFollowing(uid: string | undefined, open: boolean) {
  const ids = useQuery({ queryKey: ["sc-my-following", uid], queryFn: () => getMyFollowingIds(uid!), enabled: !!uid && open, staleTime: STALE });
  const cards = useQuery({
    queryKey: ["sc-my-following-cards", ids.data],
    queryFn: () => getFollowingCards(ids.data ?? []),
    enabled: !!ids.data?.length,
    staleTime: STALE,
  });
  return {
    list: cards.data ?? [],
    pending: ids.isPending || (!!ids.data?.length && cards.isPending),
    failed: ids.isError || cards.isError,
    retry: () => void (ids.isError ? ids.refetch() : cards.refetch()),
  };
}

export const ALL_SAVED = "saved";

/** The Saved tab: "ทั้งหมดที่บันทึก" (saved works + works in my collections) and each collection. */
export function useMySaved(uid: string | undefined, open: boolean) {
  const qc = useQueryClient();
  const savedQ = useQuery({ queryKey: ["sc-my-saved", uid], queryFn: () => getMySavedIds(uid!), enabled: !!uid && open, staleTime: STALE });
  const collKey = ["sc-my-collections", uid];
  const collQ = useQuery({ queryKey: collKey, queryFn: () => getMyCollections(uid!), enabled: !!uid && open, staleTime: STALE });
  const colls = useMemo(() => collQ.data ?? [], [collQ.data]);
  const allIds = useMemo(() => [...new Set([...(savedQ.data ?? []), ...colls.flatMap((c) => c.projectIds)])], [savedQ.data, colls]);
  const worksQ = useQuery({ queryKey: ["sc-my-saved-works", allIds], queryFn: () => getWorksByIds(allIds), enabled: allIds.length > 0, staleTime: STALE });
  const works = useMemo(() => new Map((worksQ.data ?? []).map((w) => [w.id, w])), [worksQ.data]);
  const owners = useProfilesByIds([...new Set((worksQ.data ?? []).map((w) => w.owner_id).filter((id): id is string => !!id))]);

  // Other parts of the site read saves and collections under these keys (SaveToast, home Collections view).
  const refresh = () => {
    for (const k of [collKey, ["sc-my-saved", uid], ["sc-saved-work-ids", uid], ["collections", uid], ["saved-project-ids"], ["project-in-collections"], ["sc-profile-collections", uid]]) {
      void qc.invalidateQueries({ queryKey: k });
    }
  };
  const patch = (f: (old: MyCollection[]) => MyCollection[]) => qc.setQueryData<MyCollection[]>(collKey, (old) => (old ? f(old) : old));
  const settle = { onSettled: refresh };

  const rename = useMutation({ mutationFn: (v: { id: string; name: string }) => renameCollection(v.id, v.name), ...settle });
  const setPublic = useMutation({
    mutationFn: (v: { id: string; isPublic: boolean }) => setCollectionPublic(v.id, v.isPublic),
    onMutate: (v) => patch((old) => old.map((c) => (c.id === v.id ? { ...c, isPublic: v.isPublic } : c))),
    ...settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onMutate: (id) => patch((old) => old.filter((c) => c.id !== id)),
    ...settle,
  });
  const reorder = useMutation({
    mutationFn: (v: { id: string; ids: string[] }) => reorderCollection(v.id, v.ids),
    onMutate: (v) => patch((old) => old.map((c) => (c.id === v.id ? { ...c, projectIds: v.ids } : c))),
    ...settle,
  });
  /** Move or copy picked works: into `to` (a collection id, or null = a new one), out of `from` unless it is "all saved". */
  const move = useMutation({
    mutationFn: async (v: { from: string; to: string | null; ids: string[] }) => {
      const target = v.to ? colls.find((c) => c.id === v.to) : null;
      const fresh = v.ids.filter((id) => !target?.projectIds.includes(id));
      const created = v.to ? null : await createCollectionWith(uid!, "คอลเลคชั่นใหม่", v.ids);
      if (v.to) await addToCollection(v.to, fresh);
      if (v.from !== ALL_SAVED) await removeFromCollection(v.from, v.ids);
      return created;
    },
    onSettled: refresh,
  });
  /** "เอาออก": out of this collection, or — in "all saved" — not saved anywhere any more. */
  const takeOut = useMutation({
    mutationFn: (v: { from: string; ids: string[] }) =>
      v.from === ALL_SAVED ? unsaveWorks(uid!, v.ids, colls.map((c) => c.id)) : removeFromCollection(v.from, v.ids),
    onMutate: (v) => {
      patch((old) => old.map((c) => (v.from === ALL_SAVED || c.id === v.from ? { ...c, projectIds: c.projectIds.filter((id) => !v.ids.includes(id)) } : c)));
      if (v.from === ALL_SAVED) qc.setQueryData<string[]>(["sc-my-saved", uid], (old) => old?.filter((id) => !v.ids.includes(id)));
    },
    onSettled: refresh,
  });

  return {
    allIds,
    colls,
    works,
    owners: owners.data?.map ?? {},
    pending: savedQ.isPending || collQ.isPending || (allIds.length > 0 && worksQ.isPending),
    failed: savedQ.isError || collQ.isError || worksQ.isError,
    retry: () => {
      for (const q of [savedQ, collQ, worksQ]) if (q.isError) void q.refetch();
    },
    rename,
    setPublic,
    remove,
    reorder,
    move,
    takeOut,
  };
}

export type MyEvent = ProfileEventRow & { hosted: boolean };

/** The Events tab: events I host (published, not the team's curated ones), then the ones I marked "สนใจ". */
export function useMyEvents(uid: string | undefined, open: boolean) {
  const hosted = useQuery({ queryKey: ["sc-profile-hosted", uid], queryFn: () => getHostedEvents(uid!), enabled: !!uid && open, staleTime: STALE });
  const ids = useQuery({ queryKey: ["sc-my-interested", uid], queryFn: () => getMyInterestedIds(uid!), enabled: !!uid && open, staleTime: STALE });
  const hostedIds = useMemo(() => new Set((hosted.data ?? []).map((e) => e.id)), [hosted.data]);
  const otherIds = useMemo(() => (ids.data ?? []).filter((id) => !hostedIds.has(id)), [ids.data, hostedIds]);
  const interested = useQuery({ queryKey: ["sc-my-interested-events", otherIds], queryFn: () => getEventsByIds(otherIds), enabled: otherIds.length > 0, staleTime: STALE });
  const list = useMemo<MyEvent[]>(() => {
    const byId = new Map((interested.data ?? []).map((e) => [e.id, e]));
    return [
      ...(hosted.data ?? []).map((e) => ({ ...e, hosted: true })),
      ...otherIds.map((id) => byId.get(id)).filter((e): e is ProfileEventRow => !!e).map((e) => ({ ...e, hosted: false })),
    ];
  }, [hosted.data, interested.data, otherIds]);
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (eventId: string) => toggleEventInterest(eventId),
    onSettled: () => {
      for (const k of [["sc-profile-interested", uid], ["events", "my-interests"]]) void qc.invalidateQueries({ queryKey: k });
    },
  });
  return {
    list,
    pending: hosted.isPending || ids.isPending || (otherIds.length > 0 && interested.isPending),
    failed: hosted.isError || ids.isError || interested.isError,
    retry: () => {
      for (const q of [hosted, ids, interested]) if (q.isError) void q.refetch();
    },
    toggle,
  };
}

/** "Interested · ทุกคนเห็น / เห็นแค่คุณ": one switch per person (public_visibility.interested_events, default off). */
export function useInterestedSwitch(uid: string | undefined) {
  const key = ["sc-visibility", uid];
  const vis = useQuery({ queryKey: key, queryFn: () => getMyVisibility(uid!), enabled: !!uid, staleTime: STALE });
  const set = useListMutation<Record<string, unknown>, boolean>(
    key,
    (on) => setVisibilitySwitch(uid!, "interested_events", on),
    (old, on) => ({ ...old, interested_events: on }),
    [["sc-profile-interested", uid], ["sc-my-profile", uid]],
  );
  return { on: vis.data?.interested_events === true, ready: vis.isSuccess, set: (on: boolean) => set.mutate(on) };
}
