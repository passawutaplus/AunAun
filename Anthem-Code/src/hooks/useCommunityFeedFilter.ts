import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_COMMUNITY_FILTER,
  loadCommunityFilter,
  saveCommunityFilter,
  type CommunityFeedFilter,
} from "@/data/communityTopics";

export function useCommunityFeedFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilterState] = useState<CommunityFeedFilter>(() => {
    const stored = loadCommunityFilter();
    const category = searchParams.get("category") ?? stored.category;
    const feedParam = searchParams.get("feed");
    const feedSource =
      feedParam === "following"
        ? feedParam
        : feedParam === "drill"
          ? "all"
          : stored.feedSource === "following"
            ? stored.feedSource
            : stored.feedSource === "drill"
              ? "all"
              : stored.feedSource === "all"
                ? stored.feedSource
                : DEFAULT_COMMUNITY_FILTER.feedSource;
    return {
      category: category || stored.category,
      feedSource,
    };
  });

  const setFilter = (next: CommunityFeedFilter) => {
    setFilterState(next);
    saveCommunityFilter(next);
    const params = new URLSearchParams(searchParams);
    if (params.get("mode") === "community") {
      params.set("mode", "community");
    }
    if (next.category !== "All") params.set("category", next.category);
    else params.delete("category");
    if (next.feedSource === "following") {
      params.set("feed", next.feedSource);
    } else {
      params.delete("feed");
    }
    params.delete("kind");
    params.delete("topic");
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    saveCommunityFilter(filter);
  }, [filter]);

  const queryFilter = useMemo(
    () => ({
      category: filter.category,
      feedSource: filter.feedSource,
    }),
    [filter],
  );

  return { filter, setFilter, queryFilter };
}

export { DEFAULT_COMMUNITY_FILTER };
