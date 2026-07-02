import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_COMMUNITY_FILTER,
  loadCommunityFilter,
  saveCommunityFilter,
  type CommunityFeedFilter,
} from "@/data/communityTopics";
import { decodeCommunityTagParam } from "@/lib/communityRoutes";

export type CommunityFeedQueryFilter = CommunityFeedFilter & {
  tag?: string;
};

export function useCommunityFeedFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilterState] = useState<CommunityFeedQueryFilter>(() => {
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
    const tag = decodeCommunityTagParam(searchParams.get("tag"));
    return {
      category: category || stored.category,
      feedSource,
      tag: tag || undefined,
    };
  });

  const setFilter = (next: CommunityFeedQueryFilter) => {
    setFilterState(next);
    saveCommunityFilter({ category: next.category, feedSource: next.feedSource });
    const params = new URLSearchParams(searchParams);
    if (params.get("mode") === "community" || next.tag) {
      params.set("mode", "community");
    }
    if (next.category !== "All") params.set("category", next.category);
    else params.delete("category");
    if (next.feedSource === "following") {
      params.set("feed", next.feedSource);
    } else {
      params.delete("feed");
    }
    if (next.tag?.trim()) params.set("tag", next.tag.trim());
    else params.delete("tag");
    params.delete("kind");
    params.delete("topic");
    setSearchParams(params, { replace: true });
  };

  const clearTag = () => {
    setFilter({ ...filter, tag: undefined });
  };

  useEffect(() => {
    const tag = decodeCommunityTagParam(searchParams.get("tag"));
    setFilterState((prev) => {
      const category = searchParams.get("category") ?? prev.category;
      const feedParam = searchParams.get("feed");
      const feedSource =
        feedParam === "following"
          ? feedParam
          : feedParam === "drill"
            ? "all"
            : prev.feedSource === "following"
              ? prev.feedSource
              : "all";
      return {
        category: category || prev.category,
        feedSource,
        tag: tag || undefined,
      };
    });
  }, [searchParams]);

  useEffect(() => {
    saveCommunityFilter({ category: filter.category, feedSource: filter.feedSource });
  }, [filter.category, filter.feedSource]);

  const queryFilter = useMemo(
    () => ({
      category: filter.category,
      feedSource: filter.feedSource,
      tag: filter.tag,
    }),
    [filter],
  );

  return { filter, setFilter, queryFilter, clearTag };
}

export { DEFAULT_COMMUNITY_FILTER };
