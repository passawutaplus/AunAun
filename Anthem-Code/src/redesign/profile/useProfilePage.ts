import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getEventsByIds,
  getFollowerIds,
  getHostedEvents,
  getInterestedEventIds,
  getProfileCatalogs,
  getProfileCollections,
  getProfilePage,
  getProfileWorks,
  getWorksByIds,
  type ProfileEventRow,
} from "@/server/queries/profilePage";

const STALE = 5 * 60_000;

/** The profile itself, by handle (without @) or user id. */
export function useProfilePage(slug: string | undefined) {
  return useQuery({ queryKey: ["sc-profile", slug], queryFn: () => getProfilePage(slug!), enabled: !!slug, staleTime: 60_000 });
}

export function useProfileWorks(ownerId: string | undefined) {
  return useQuery({ queryKey: ["sc-profile-works", ownerId], queryFn: () => getProfileWorks(ownerId!), enabled: !!ownerId, staleTime: STALE });
}

export function useProfileCatalogs(ownerId: string | undefined) {
  return useQuery({ queryKey: ["sc-profile-catalogs", ownerId], queryFn: () => getProfileCatalogs(ownerId!), enabled: !!ownerId, staleTime: STALE });
}

/** Public collections, and the cards of the works in them (they may be other people's works). */
export function useProfileCollections(ownerId: string | undefined) {
  const colls = useQuery({
    queryKey: ["sc-profile-collections", ownerId],
    queryFn: () => getProfileCollections(ownerId!),
    enabled: !!ownerId,
    staleTime: STALE,
  });
  const ids = useMemo(() => [...new Set((colls.data ?? []).flatMap((c) => c.projectIds))], [colls.data]);
  const works = useQuery({
    queryKey: ["sc-profile-collection-works", ids],
    queryFn: () => getWorksByIds(ids),
    enabled: ids.length > 0,
    staleTime: STALE,
  });
  // A collection shows only the works that are still public; one with none left is not shown.
  const list = useMemo(() => {
    const byId = new Map((works.data ?? []).map((w) => [w.id, w]));
    return (colls.data ?? [])
      .map((c) => ({ ...c, works: c.projectIds.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => !!w) }))
      .filter((c) => c.works.length > 0);
  }, [colls.data, works.data]);
  return { list, pending: colls.isPending || (ids.length > 0 && works.isPending) };
}

export type ProfileEvent = ProfileEventRow & { hosted: boolean };

/** Hosted events first (mock: "Hosted อยู่บนเสมอ"), then the ones the person shows as Interested. */
export function useProfileEvents(userId: string | undefined) {
  const hosted = useQuery({ queryKey: ["sc-profile-hosted", userId], queryFn: () => getHostedEvents(userId!), enabled: !!userId, staleTime: STALE });
  const interestIds = useQuery({
    queryKey: ["sc-profile-interested", userId],
    queryFn: () => getInterestedEventIds(userId!),
    enabled: !!userId,
    staleTime: STALE,
  });
  const hostedIds = useMemo(() => new Set((hosted.data ?? []).map((e) => e.id)), [hosted.data]);
  const otherIds = useMemo(() => (interestIds.data ?? []).filter((id) => !hostedIds.has(id)), [interestIds.data, hostedIds]);
  const interested = useQuery({
    queryKey: ["sc-profile-interested-events", otherIds],
    queryFn: () => getEventsByIds(otherIds),
    enabled: otherIds.length > 0,
    staleTime: STALE,
  });
  const list = useMemo<ProfileEvent[]>(() => {
    const byId = new Map((interested.data ?? []).map((e) => [e.id, e]));
    return [
      ...(hosted.data ?? []).map((e) => ({ ...e, hosted: true })),
      ...otherIds.map((id) => byId.get(id)).filter((e): e is ProfileEventRow => !!e).map((e) => ({ ...e, hosted: false })),
    ];
  }, [hosted.data, interested.data, otherIds]);
  return { list, pending: hosted.isPending || interestIds.isPending };
}

/** Followers, the people the viewer follows first ("… และอีก N คนติดตามอยู่", owner 2026-11-28). */
export function useProfileFollowers(userId: string | undefined, viewerFollows: ReadonlySet<string>) {
  const q = useQuery({ queryKey: ["sc-profile-followers", userId], queryFn: () => getFollowerIds(userId!), enabled: !!userId, staleTime: 60_000 });
  return useMemo(() => {
    const ids = q.data ?? [];
    return [...ids.filter((id) => viewerFollows.has(id)), ...ids.filter((id) => !viewerFollows.has(id))];
  }, [q.data, viewerFollows]);
}
