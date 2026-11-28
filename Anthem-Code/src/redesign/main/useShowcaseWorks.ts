import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProjectIds } from "@/hooks/useCollections";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { useForYouProjects } from "@/hooks/useProjects";
import { getFollowingIds, getHomeHiddenIds, getSavedWorkIds, getShowcaseRows, type ShowcaseRow } from "@/server/queries/showcase";
import type { ScCategory } from "../lib/categories";

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
 */
export function useShowcaseWorks(view: ShowcaseView, category: ScCategory | null) {
  const { user } = useAuth();
  const uid = user?.id;
  const visible = useFeedProjectSelect();

  const hidden = useQuery({ queryKey: ["sc-home-hidden"], queryFn: getHomeHiddenIds, staleTime: 10 * 60_000 });
  const following = useQuery({ queryKey: ["sc-following-ids", uid], queryFn: () => getFollowingIds(uid!), enabled: view === "following" && !!uid });
  const bookmarks = useQuery({ queryKey: ["sc-saved-work-ids", uid], queryFn: () => getSavedWorkIds(uid!), enabled: view === "collections" && !!uid });
  const inCollections = useSavedProjectIds(view === "collections" ? uid : undefined);
  const forYou = useForYouProjects(view === "explore" ? uid : undefined);

  const picks = useMemo(() => (forYou.data ?? []).map((p) => p.id), [forYou.data]);
  const savedIds = useMemo(() => [...new Set([...(bookmarks.data ?? []), ...(inCollections.data ?? [])])], [bookmarks.data, inCollections.data]);
  const hiddenIds = hidden.data;

  // What has to be known before the first page can be asked for.
  const waiting =
    hidden.isPending ||
    (!!uid &&
      ((view === "following" && following.isPending) ||
        (view === "collections" && (bookmarks.isPending || inCollections.isPending)) ||
        (view === "explore" && forYou.isPending)));

  const personal = view === "explore" && picks.length > 0;
  const scope = view === "following" ? following.data : view === "collections" ? savedIds : personal ? picks : null;

  const query = useInfiniteQuery({
    queryKey: ["sc-showcase", view, category ?? "all", uid ?? "", hiddenIds, scope],
    enabled: !waiting,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ShowcaseRow[]> => {
      const off = hiddenIds ?? [];
      const page = (n: number) => [n * PAGE, (n + 1) * PAGE - 1] as const;
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
      if (personal && all.length === 1) return 1;
      return last.length < PAGE ? undefined : all.length;
    },
    select: (data) => visible(data.pages.flat()),
  });

  return { ...query, isPending: waiting || query.isPending };
}
