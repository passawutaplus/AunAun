import { LayoutGrid, LayoutList, Rows3 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import ProjectManageSortSelect from "@/components/portfolio/ProjectManageSortSelect";
import { IconSegmentPill, type SegmentOption } from "@/components/ui/IconSegmentPill";
import { cn } from "@/lib/utils";
import type { ProjectManageSortMode } from "@/lib/portfolioManageSort";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";

export type SeriesStatusFilter = "all" | "Published" | "Draft" | "Private";
export type SeriesVisibilityFilter = "all" | "public" | "private";

const SERIES_DENSITY_OPTIONS: SegmentOption<SeriesWorksDensity>[] = [
  {
    value: "large",
    label: "ใหญ่",
    icon: (
      <span className="inline-grid grid-cols-2 gap-px" aria-hidden>
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
      </span>
    ),
  },
  {
    value: "medium",
    label: "กลาง",
    icon: <LayoutGrid className="h-3.5 w-3.5" />,
  },
  {
    value: "small",
    label: "เล็ก",
    icon: <Rows3 className="h-3.5 w-3.5" />,
  },
  {
    value: "list",
    label: "รายการ",
    icon: <LayoutList className="h-3.5 w-3.5" />,
  },
];

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
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-[9.5rem] sm:shrink-0">
          <IconSegmentPill
            value={density}
            options={SERIES_DENSITY_OPTIONS}
            onChange={onDensityChange}
            layoutGroupId="series-workspace-density"
            variant="ghost"
            className="w-full justify-between"
          />
          <ProjectManageSortSelect
            value={sortMode}
            onChange={onSortChange}
            className="w-full min-w-0 max-w-none"
          />
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
