import type { Project } from "@/data/projectTypes";
import type { ProjectManageStats } from "@/hooks/usePortfolioProjectStats";

export type ProjectManageSortMode =
  | "newest"
  | "oldest"
  | "likes"
  | "views"
  | "hires"
  | "collabs"
  | "collection_saves"
  | "comments";

export const PROJECT_MANAGE_SORT_OPTIONS: { value: ProjectManageSortMode; label: string }[] = [
  { value: "newest", label: "ล่าสุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "likes", label: "ไลค์เยอะสุด" },
  { value: "views", label: "คนดูเยอะสุด" },
  { value: "hires", label: "คนจ้างเยอะสุด" },
  { value: "collabs", label: "คนคอลแลปเยอะสุด" },
  { value: "collection_saves", label: "บันทึกคอลเลกชันเยอะสุด" },
  { value: "comments", label: "คอมเมนต์เยอะสุด" },
];

export const DEFAULT_PROJECT_MANAGE_SORT: ProjectManageSortMode = "newest";

export function projectManageSortLabel(mode: ProjectManageSortMode): string {
  return PROJECT_MANAGE_SORT_OPTIONS.find((option) => option.value === mode)?.label ?? "ล่าสุด";
}

function projectTimestamp(project: Project): number {
  const parsed = Date.parse(project.publishedDate ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function statValue(stats: ProjectManageStats | undefined, key: keyof ProjectManageStats): number {
  if (!stats) return 0;
  const value = stats[key];
  return typeof value === "number" ? value : 0;
}

export function sortManageProjects(
  projects: Project[],
  mode: ProjectManageSortMode,
  statsMap: Record<string, ProjectManageStats | undefined>,
): Project[] {
  const sorted = [...projects];

  switch (mode) {
    case "newest":
      return sorted.sort((a, b) => projectTimestamp(b) - projectTimestamp(a));
    case "oldest":
      return sorted.sort((a, b) => projectTimestamp(a) - projectTimestamp(b));
    case "likes":
      return sorted.sort((a, b) => b.likes - a.likes);
    case "views":
      return sorted.sort((a, b) => b.views - a.views);
    case "hires":
      return sorted.sort(
        (a, b) => statValue(statsMap[b.id], "hireCount") - statValue(statsMap[a.id], "hireCount"),
      );
    case "collabs":
      return sorted.sort(
        (a, b) => statValue(statsMap[b.id], "collabCount") - statValue(statsMap[a.id], "collabCount"),
      );
    case "collection_saves":
      return sorted.sort(
        (a, b) =>
          statValue(statsMap[b.id], "collectionSaveCount") -
          statValue(statsMap[a.id], "collectionSaveCount"),
      );
    case "comments":
      return sorted.sort(
        (a, b) => statValue(statsMap[b.id], "commentCount") - statValue(statsMap[a.id], "commentCount"),
      );
    default:
      return sorted;
  }
}
