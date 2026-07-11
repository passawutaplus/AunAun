import SearchBar from "@/components/SearchBar";
import ProjectManageSortSelect from "@/components/portfolio/ProjectManageSortSelect";
import { SeriesDensitySelect } from "@/components/series/SeriesDensitySelect";
import { cn } from "@/lib/utils";
import type { ProjectManageSortMode } from "@/lib/portfolioManageSort";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";

export type SeriesStatusFilter = "all" | "Published" | "Draft" | "Private";
export type SeriesVisibilityFilter = "all" | "public" | "private";

const PROJECT_STATUS_TABS: { value: SeriesStatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "Published", label: "Published" },
  { value: "Draft", label: "Draft" },
  { value: "Private", label: "Private" },
];

const FOLDER_VISIBILITY_TABS: { value: SeriesVisibilityFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "public", label: "สาธารณะ" },
  { value: "private", label: "ส่วนตัว" },
];

type BaseProps = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  density: SeriesWorksDensity;
  onDensityChange: (value: SeriesWorksDensity) => void;
  sortMode: ProjectManageSortMode;
  onSortChange: (value: ProjectManageSortMode) => void;
};

type ProjectFilterProps = BaseProps & {
  filterMode: "projects";
  statusFilter: SeriesStatusFilter;
  onStatusFilterChange: (value: SeriesStatusFilter) => void;
  statusCounts: Record<SeriesStatusFilter, number>;
};

type FolderFilterProps = BaseProps & {
  filterMode: "folders";
  visibilityFilter: SeriesVisibilityFilter;
  onVisibilityFilterChange: (value: SeriesVisibilityFilter) => void;
  visibilityCounts: Record<SeriesVisibilityFilter, number>;
};

export type SeriesWorkspaceToolbarProps = ProjectFilterProps | FolderFilterProps;

export function SeriesWorkspaceToolbar(props: SeriesWorkspaceToolbarProps) {
  const {
    title,
    subtitle,
    searchPlaceholder,
    query,
    onQueryChange,
    density,
    onDensityChange,
    sortMode,
    onSortChange,
  } = props;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-0.5 self-start">
          <SeriesDensitySelect value={density} onChange={onDensityChange} />
          <ProjectManageSortSelect value={sortMode} onChange={onSortChange} />
        </div>
      </div>

      <div className="min-w-0">
        <SearchBar
          compact
          placeholder={searchPlaceholder}
          value={query}
          onChange={onQueryChange}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {props.filterMode === "projects"
          ? PROJECT_STATUS_TABS.map((tab) => {
              const active = props.statusFilter === tab.value;
              const count = props.statusCounts[tab.value];
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => props.onStatusFilterChange(tab.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : "opacity-60")}
                  >
                    {count}
                  </span>
                </button>
              );
            })
          : FOLDER_VISIBILITY_TABS.map((tab) => {
              const active = props.visibilityFilter === tab.value;
              const count = props.visibilityCounts[tab.value];
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => props.onVisibilityFilterChange(tab.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : "opacity-60")}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
      </div>
    </div>
  );
}
