import { useMemo } from "react";
import { useMyProjects, usePublishedProjects } from "@/hooks/useProjects";
import { COMMON_TOOLS, compareToolsVisualFirst, isAudioTool } from "@/lib/toolIcons";

const USER_WEIGHT = 4;
const PLATFORM_WEIGHT = 1;
const MAX_SUGGESTIONS = 30;

export { COMMON_TOOLS, isAudioTool };

function normalizeTool(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Frequent tools: user's own usage weighted higher, then platform-wide. */
export function useToolSuggestions(userId: string | undefined) {
  const { data: mine = [] } = useMyProjects(userId);
  const { data: published = [] } = usePublishedProjects();

  return useMemo(() => {
    const freq = new Map<string, { count: number; label: string }>();

    const bump = (raw: string, weight: number) => {
      const key = normalizeTool(raw);
      if (!key || key.length > 40) return;
      const prev = freq.get(key);
      freq.set(key, {
        count: (prev?.count ?? 0) + weight,
        label: prev?.label ?? raw.trim(),
      });
    };

    COMMON_TOOLS.forEach((t) => bump(t, 0.5));
    mine.forEach((p) => (p.tools ?? []).forEach((t) => bump(t, USER_WEIGHT)));
    published.forEach((p) => (p.tools ?? []).forEach((t) => bump(t, PLATFORM_WEIGHT)));

    return [...freq.entries()]
      .sort((a, b) => {
        const countDiff = b[1].count - a[1].count;
        if (countDiff !== 0) return countDiff;
        return compareToolsVisualFirst(a[1].label, b[1].label);
      })
      .map(([, v]) => v.label)
      .slice(0, MAX_SUGGESTIONS);
  }, [mine, published]);
}

export function normalizeToolKey(raw: string): string {
  return normalizeTool(raw);
}
