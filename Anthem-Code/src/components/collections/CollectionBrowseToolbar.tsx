import { LayoutGrid, LayoutList, Rows3 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { IconSegmentPill, type SegmentOption } from "@/components/ui/IconSegmentPill";
import { cn } from "@/lib/utils";
import type { CollectionGridDensity } from "@/lib/collectionGridDensity";

/** Sort pills on collection list (folders). */
export type CollectionListSortMode = "newest" | "oldest" | "items";
/** Sort pills on collection detail (projects). */
export type CollectionItemsSortMode = "newest" | "oldest" | "likes" | "views";

const DENSITY_OPTIONS: SegmentOption<CollectionGridDensity>[] = [
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

const LIST_SORT_TABS: { value: CollectionListSortMode; label: string }[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "items", label: "ผลงานเยอะสุด" },
];

const ITEMS_SORT_TABS: { value: CollectionItemsSortMode; label: string }[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "likes", label: "ไลค์เยอะสุด" },
  { value: "views", label: "คนดูเยอะสุด" },
];

type BaseProps = {
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  density: CollectionGridDensity;
  onDensityChange: (value: CollectionGridDensity) => void;
  resultCount?: number;
  className?: string;
};

type CollectionsSortProps = BaseProps & {
  mode: "collections";
  sortMode: CollectionListSortMode;
  onSortModeChange: (value: CollectionListSortMode) => void;
};

type ItemsSortProps = BaseProps & {
  mode: "items";
  sortMode: CollectionItemsSortMode;
  onSortModeChange: (value: CollectionItemsSortMode) => void;
};

export type CollectionBrowseToolbarProps = CollectionsSortProps | ItemsSortProps;

export function CollectionBrowseToolbar(props: CollectionBrowseToolbarProps) {
  const {
    searchPlaceholder,
    query,
    onQueryChange,
    density,
    onDensityChange,
    resultCount,
    className,
  } = props;

  const tabs =
    props.mode === "collections" ? LIST_SORT_TABS : ITEMS_SORT_TABS;

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
            layoutGroupId="collection-browse-density"
            variant="ghost"
            className="justify-between sm:w-[9.5rem]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = props.sortMode === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                if (props.mode === "collections") {
                  props.onSortModeChange(tab.value as CollectionListSortMode);
                } else {
                  props.onSortModeChange(tab.value as CollectionItemsSortMode);
                }
              }}
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
