import { useInfiniteQuery } from "@tanstack/react-query";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { getShowcaseRows } from "@/server/queries/showcase";
import type { ScCategory } from "../lib/categories";

const PAGE = 51; // three "load more" steps of the bento

/**
 * Published works for the home grid, newest first; one category is filtered in the database.
 * Works of blocked people and works the viewer hid are dropped, as in the old feed.
 */
export function useShowcaseWorks(category: ScCategory | null) {
  const visible = useFeedProjectSelect();
  return useInfiniteQuery({
    queryKey: ["sc-showcase", category ?? "all"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getShowcaseRows(category, pageParam, pageParam + PAGE - 1),
    getNextPageParam: (last, all) => (last.length < PAGE ? undefined : all.length * PAGE),
    select: (data) => visible(data.pages.flat()),
  });
}
