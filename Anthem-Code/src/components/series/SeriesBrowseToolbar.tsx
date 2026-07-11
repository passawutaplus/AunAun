import { LayoutGrid, LayoutList, Rows3 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { IconSegmentPill, type SegmentOption } from "@/components/ui/IconSegmentPill";
import { cn } from "@/lib/utils";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";

export type SeriesBrowseSortMode = "newest" | "oldest" | "likes" | "views";

const DENSITY_OPTIONS: SegmentOption<SeriesWorksDensity>[] = [
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

const SORT_TABS: { value: SeriesBrowseSortMode; label: string }[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "likes", label: "ไลค์เยอะสุด" },
  { value: "views", label: "คนดูเยอะสุด" },
];

type Props = {
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  density: SeriesWorksDensity;
  onDensityChange: (value: SeriesWorksDensity) => void;
  sortMode: SeriesBrowseSortMode;
  onSortModeChange: (value: SeriesBrowseSortMode) => void;
  resultCount?: number;
  className?: string;
};

export function SeriesBrowseToolbar({
  searchPlaceholder,
  query,
  onQueryChange,
  density,
  onDensityChange,
  sortMode,
  onSortModeChange,
  resultCount,
  className,
}: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <SearchBar
            compact
            placeholder={searchPlaceholder}
            value={query}
            onChange={onQueryChange}
          />
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end sm:shrink-0">
          {typeof resultCount === "number" ? (
            <p className="text-xs text-muted-foreground tabular-nums sm:hidden">
              {resultCount} รายการ
            </p>
          ) : null}
          <IconSegmentPill
            value={density}
            options={DENSITY_OPTIONS}
            onChange={onDensityChange}
            layoutGroupId="series-browse-density"
            variant="ghost"
            className="justify-between sm:w-[9.5rem]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SORT_TABS.map((tab) => {
          const active = sortMode === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSortModeChange(tab.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
        {typeof resultCount === "number" ? (
          <span className="ml-auto hidden text-xs text-muted-foreground tabular-nums sm:inline">
            แสดง {resultCount} รายการ
          </span>
        ) : null}
      </div>
    </div>
  );
}
