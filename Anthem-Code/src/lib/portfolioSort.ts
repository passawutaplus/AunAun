export type PortfolioSortMode =
  | "portfolio"
  | "newest"
  | "oldest"
  | "views"
  | "likes"
  | "hires";

type SortableProject = {
  id?: string;
  is_pinned?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
  views?: number | null;
  likes?: number | null;
};

/** Owner profile order: pinned first, then sort_order, then newest. */
export function sortPortfolioProjects<T extends SortableProject>(
  projects: T[],
  mode: PortfolioSortMode = "portfolio",
  hireCounts?: Record<string, number>,
): T[] {
  const arr = [...projects];
  if (mode === "views") {
    return arr.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  }
  if (mode === "likes") {
    return arr.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  }
  if (mode === "hires") {
    return arr.sort(
      (a, b) =>
        (hireCounts?.[b.id ?? ""] ?? 0) - (hireCounts?.[a.id ?? ""] ?? 0) ||
        (b.views ?? 0) - (a.views ?? 0),
    );
  }
  if (mode === "newest") {
    return arr.sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
  }
  if (mode === "oldest") {
    return arr.sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
    );
  }
  return arr.sort((a, b) => {
    const pinDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned);
    if (pinDiff !== 0) return pinDiff;
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}

export const MAX_PINNED_PROJECTS = 3;
