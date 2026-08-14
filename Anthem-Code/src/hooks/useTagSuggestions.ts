import { useMemo } from "react";
import { useMyProjects } from "@/hooks/useProjects";
import { usePublishedProjects } from "@/hooks/useProjects";
import { normalizeTag } from "@/lib/exploreRoutes";

const MAX_SUGGESTIONS = 30;

function projectTime(p: { updated_at?: string | null; created_at?: string | null }): number {
  const raw = p.updated_at || p.created_at || "";
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/** Recent tags first (user's latest projects), then frequent platform tags. */
export function useTagSuggestions(userId: string | undefined) {
  const { data: mine = [] } = useMyProjects(userId);
  const { data: published = [] } = usePublishedProjects();

  return useMemo(() => {
    const seen = new Set<string>();
    const recent: string[] = [];

    const push = (raw: string) => {
      const key = normalizeTag(raw);
      if (!key || key.length > 30 || seen.has(key)) return false;
      seen.add(key);
      recent.push(raw.trim().replace(/^#+/, ""));
      return recent.length >= MAX_SUGGESTIONS;
    };

    const mineNewestFirst = [...mine].sort((a, b) => projectTime(b) - projectTime(a));
    for (const p of mineNewestFirst) {
      // Newest tags on a project are appended last.
      for (const t of [...(p.tags ?? [])].reverse()) {
        if (push(t)) return recent;
      }
    }

    const freq = new Map<string, { count: number; label: string }>();
    const bump = (raw: string) => {
      const key = normalizeTag(raw);
      if (!key || key.length > 30 || seen.has(key)) return;
      const prev = freq.get(key);
      freq.set(key, {
        count: (prev?.count ?? 0) + 1,
        label: prev?.label ?? raw.trim().replace(/^#+/, ""),
      });
    };

    published.forEach((p) => (p.tags ?? []).forEach((t) => bump(t)));

    const byFreq = [...freq.values()].sort((a, b) => b.count - a.count);
    for (const v of byFreq) {
      if (push(v.label)) return recent;
    }

    return recent;
  }, [mine, published]);
}
