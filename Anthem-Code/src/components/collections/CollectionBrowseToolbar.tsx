import { ArrowUpDown } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { InspireViewDensityMenu } from "@/components/inspire/InspireViewDensityMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CollectionGridDensity } from "@/lib/collectionGridDensity";
import type { InspireGridDensity } from "@/lib/inspireGridDensity";
import { cn } from "@/lib/utils";

/** Sort options on collection list (folders). */
export type CollectionListSortMode = "newest" | "oldest" | "items";
/** Sort options on collection detail (projects). */
export type CollectionItemsSortMode = "newest" | "oldest" | "likes" | "views";

const LIST_SORT_OPTIONS: { value: CollectionListSortMode; label: string }[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "items", label: "ผลงานเยอะสุด" },
];

const ITEMS_SORT_OPTIONS: { value: CollectionItemsSortMode; label: string }[] = [
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

/** Same layout as Inspiration: search + grid density menu + sort select. */
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

  const options = props.mode === "collections" ? LIST_SORT_OPTIONS : ITEMS_SORT_OPTIONS;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <SearchBar
            compact
            placeholder={searchPlaceholder}
            value={query}
            onChange={onQueryChange}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <InspireViewDensityMenu
            value={density as InspireGridDensity}
            onChange={(v) => onDensityChange(v as CollectionGridDensity)}
          />
          <Select
            value={props.sortMode}
            onValueChange={(v) => {
              if (props.mode === "collections") {
                props.onSortModeChange(v as CollectionListSortMode);
              } else {
                props.onSortModeChange(v as CollectionItemsSortMode);
              }
            }}
          >
            <SelectTrigger
              aria-label="เรียงตาม"
              className="h-9 w-full sm:w-[10.5rem] shrink-0 rounded-full border-border/50 bg-transparent text-xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {typeof resultCount === "number" ? (
        <p className="text-xs text-muted-foreground tabular-nums sm:text-right">
          แสดง {resultCount} รายการ
        </p>
      ) : null}
    </div>
  );
}
