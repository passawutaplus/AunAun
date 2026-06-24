import { useMemo } from "react";
import { useMyProjects } from "@/hooks/useProjects";
import { usePublishedProjects } from "@/hooks/useProjects";
import { normalizeTag } from "@/lib/exploreRoutes";

const USER_WEIGHT = 4;
const PLATFORM_WEIGHT = 1;
const MAX_SUGGESTIONS = 30;

/** Frequent tags: user's own usage weighted higher, then platform-wide. */
export function useTagSuggestions(userId: string | undefined) {
  const { data: mine = [] } = useMyProjects(userId);
  const { data: published = [] } = usePublishedProjects();

  return useMemo(() => {
    const freq = new Map<string, { count: number; label: string }>();

    const bump = (raw: string, weight: number) => {
      const key = normalizeTag(raw);
      if (!key || key.length > 30) return;
      const prev = freq.get(key);
      freq.set(key, {
        count: (prev?.count ?? 0) + weight,
        label: prev?.label ?? raw.trim().replace(/^#+/, ""),
      });
    };

    mine.forEach((p) => (p.tags ?? []).forEach((t) => bump(t, USER_WEIGHT)));
    published.forEach((p) => (p.tags ?? []).forEach((t) => bump(t, PLATFORM_WEIGHT)));

    return [...freq.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([, v]) => v.label)
      .slice(0, MAX_SUGGESTIONS);
  }, [mine, published]);
}
