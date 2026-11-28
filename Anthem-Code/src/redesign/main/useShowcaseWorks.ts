import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProjectIds } from "@/hooks/useCollections";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { useForYouProjects } from "@/hooks/useProjects";
import { getFollowingIds, getHomeHiddenIds, getSavedWorkIds, getShowcaseRows, type ShowcaseRow } from "@/server/queries/showcase";
import { workSearchTextQuery } from "@/server/queries/siteSearch";
import type { ScCategory } from "../lib/categories";
import { matchesFind } from "./homeFind";
import { homeWorksQuery } from "./useCreators";

const PAGE = 51; // three "load more" steps of the bento

/**
 * Orders of the home grid (owner, 2026-11-27):
 *  explore     — everything, re-ordered for the signed-in person by the existing "for you" ranking
 *  following   — works of the people I follow
 *  latest      — newest first
 *  collections — every work I saved
 * "Samecor Picks" comes from the Picker community and has no data source here yet.
 */
export const SHOWCASE_VIEWS = ["explore", "following", "latest", "collections"] as const;
export type ShowcaseView = (typeof SHOWCASE_VIEWS)[number];
export const VIEW_NEEDS_LOGIN: Record<ShowcaseView, boolean> = { explore: false, following: true, latest: false, collections: true };

const byOrder = (rows: ShowcaseRow[], order: readonly string[]) => {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
};

/**
 * Published works for the home grid. One category is filtered in the database. Works of blocked people,
 * works the viewer hid and works the team keeps off the home page are dropped.
 * `find` (`?find=`) keeps the works whose title, creator, category, tags, tools or description match, newest
 * first: matched in the browser over the newest published works (the search panel's words), then loaded by id.
 */
export function useShowcaseWorks(view: ShowcaseView, category: ScCategory | null, find = "") {
  const { user } = useAuth();
  const uid = user?.id;
  const visible = useFeedProjectSelect();

  const hidden = useQuery({ queryKey: ["sc-home-hidden"], queryFn: getHomeHiddenIds, staleTime: 10 * 60_000 });
  const following = useQuery({ queryKey: ["sc-following-ids", uid], queryFn: () => getFollowingIds(uid!), enabled: view === "following" && !!uid });
  const bookmarks = useQuery({ queryKey: ["sc-saved-work-ids", uid], queryFn: () => getSavedWorkIds(uid!), enabled: view === "collections" && !!uid });
  const inCollections = useSavedProjectIds(view === "collections" ? uid : undefined);
  const forYou = useForYouProjects(view === "explore" ? uid : undefined);
  const q = find.trim();
  const words = useQuery({ ...workSearchTextQuery, enabled: !!q });
  const home = useQuery({ ...homeWorksQuery, enabled: !!q }); // creator names

  const picks = useMemo(() => (forYou.data ?? []).map((p) => p.id), [forYou.data]);
  const savedIds = useMemo(() => [...new Set([...(bookmarks.data ?? []), ...(inCollections.data ?? [])])], [bookmarks.data, inCollections.data]);
  const hiddenIds = hidden.data;

  // Ids of the works the text filter keeps, newest first, with this view and category already applied.
  const found = useMemo(() => {
    if (!q) return null;
    if (!words.data) return []; // the words did not load: nothing, never the unfiltered grid
    const off = new Set(hiddenIds ?? []);
    const owners = view === "following" ? new Set(following.data ?? []) : null;
    const saved = view === "collections" ? new Set(savedIds) : null;
    const names = new Map((home.data?.profiles ?? []).map((p) => [p.user_id, [p.display_name, p.username]]));
    return words.data
      .filter((w) => {
        if (off.has(w.id) || (category && w.sc_category !== category)) return false;
        if (owners && !(w.owner_id && owners.has(w.owner_id))) return false;
        if (saved && !saved.has(w.id)) return false;
        const by = (w.owner_id && names.get(w.owner_id)) || [];
        return matchesFind(q, [w.title, ...by, w.sc_category, ...(w.tags ?? []), ...(w.tools ?? []), w.description]);
      })
      .map((w) => w.id);
  }, [q, words.data, home.data, hiddenIds, category, view, following.data, savedIds]);

  // What has to be known before the first page can be asked for.
  const waiting =
    hidden.isPending ||
    (!!uid &&
      ((view === "following" && following.isPending) ||
        (view === "collections" && (bookmarks.isPending || inCollections.isPending)) ||
        (view === "explore" && !q && forYou.isPending))) ||
    (!!q && (words.isPending || home.isPending));

  // While searching, the matches stay newest first (no "for you" order).
  const personal = view === "explore" && picks.length > 0 && !q;
  const scope = view === "following" ? following.data : view === "collections" ? savedIds : personal ? picks : null;

  const query = useInfiniteQuery({
    queryKey: ["sc-showcase", view, category ?? "all", uid ?? "", hiddenIds, scope, found],
    enabled: !waiting,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ShowcaseRow[]> => {
      const off = hiddenIds ?? [];
      const page = (n: number) => [n * PAGE, (n + 1) * PAGE - 1] as const;
      if (found) {
        const ids = found.slice(pageParam * PAGE, (pageParam + 1) * PAGE);
        return byOrder(await getShowcaseRows({ ids }, 0, ids.length), ids);
      }
      if (view === "following") return getShowcaseRows({ category, ownerIds: following.data ?? [], excludeIds: off }, ...page(pageParam));
      if (view === "collections") return getShowcaseRows({ category, ids: savedIds }, ...page(pageParam));
      if (personal) {
        // first the works picked for this person, in their order; then everything else, newest first
        const shown = picks.filter((id) => !off.includes(id));
        if (pageParam === 0) return byOrder(await getShowcaseRows({ category, ids: shown }, 0, shown.length), shown);
        return getShowcaseRows({ category, excludeIds: [...off, ...shown] }, ...page(pageParam - 1));
      }
      return getShowcaseRows({ category, excludeIds: off }, ...page(pageParam));
    },
    getNextPageParam: (last, all) => {
      if (found) return all.length * PAGE < found.length ? all.length : undefined;
      if (personal && all.length === 1) return 1;
      return last.length < PAGE ? undefined : all.length;
    },
    select: (data) => visible(data.pages.flat()),
  });

  const wordsFailed = !!q && words.isError;
  return {
    ...query,
    isPending: waiting || query.isPending,
    isError: query.isError || wordsFailed,
    refetch: () => (wordsFailed ? words.refetch() : query.refetch()),
  };
}
