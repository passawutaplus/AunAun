import type { ReactNode } from "react";
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
/** Sort options on collection detail (projects). "manual" is the order the owner arranged. */
export type CollectionItemsSortMode = "manual" | "newest" | "oldest" | "likes" | "views";
/** Sort options on saved packages. */
export type SavedPackagesSortMode = "newest" | "oldest" | "price_asc" | "price_desc";
/** Sort options on the owner's own works: the same plus the portfolio order visitors see. */
export type ProfileWorksSortMode = "portfolio" | Exclude<CollectionItemsSortMode, "manual">;

const LIST_SORT_OPTIONS: { value: CollectionListSortMode; label: string }[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "items", label: "ผลงานเยอะสุด" },
];

const ITEMS_SORT_OPTIONS: { value: CollectionItemsSortMode; label: string }[] = [
  { value: "manual", label: "ลำดับที่จัดไว้" },
  { value: "newest", label: "บันทึกล่าสุด" },
  { value: "oldest", label: "บันทึกเก่าสุด" },
  { value: "likes", label: "ไลค์เยอะสุด" },
  { value: "views", label: "คนดูเยอะสุด" },
];

const PACKAGES_SORT_OPTIONS: { value: SavedPackagesSortMode; label: string }[] = [
  { value: "newest", label: "บันทึกล่าสุด" },
  { value: "oldest", label: "บันทึกเก่าสุด" },
  { value: "price_asc", label: "ราคาต่ำ → สูง" },
  { value: "price_desc", label: "ราคาสูง → ต่ำ" },
];

const WORKS_SORT_OPTIONS: { value: ProfileWorksSortMode; label: string }[] = [
  { value: "portfolio", label: "ลำดับพอร์ต" },
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
  /** Profile page grid: 1/2 columns on mobile, Small/Medium/Extra large/Details on PC. */
  densityPreset?: "default" | "profile";
  /** Extra controls after the sort select (e.g. a reorder button). */
  actions?: ReactNode;
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

type WorksSortProps = BaseProps & {
  mode: "works";
  sortMode: ProfileWorksSortMode;
  onSortModeChange: (value: ProfileWorksSortMode) => void;
};

type PackagesSortProps = BaseProps & {
  mode: "packages";
  sortMode: SavedPackagesSortMode;
  onSortModeChange: (value: SavedPackagesSortMode) => void;
};

export type CollectionBrowseToolbarProps =
  | CollectionsSortProps
  | ItemsSortProps
  | WorksSortProps
  | PackagesSortProps;

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
    densityPreset = "default",
    actions,
  } = props;

  const options =
    props.mode === "collections"
      ? LIST_SORT_OPTIONS
      : props.mode === "works"
        ? WORKS_SORT_OPTIONS
        : props.mode === "packages"
          ? PACKAGES_SORT_OPTIONS
          : ITEMS_SORT_OPTIONS;

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
        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <InspireViewDensityMenu
            value={density as InspireGridDensity}
            onChange={(v) => onDensityChange(v as CollectionGridDensity)}
            preset={densityPreset}
          />
          <Select
            value={props.sortMode}
            onValueChange={(v) => {
              if (props.mode === "collections") {
                props.onSortModeChange(v as CollectionListSortMode);
              } else if (props.mode === "works") {
                props.onSortModeChange(v as ProfileWorksSortMode);
              } else if (props.mode === "packages") {
                props.onSortModeChange(v as SavedPackagesSortMode);
              } else {
                props.onSortModeChange(v as CollectionItemsSortMode);
              }
            }}
          >
            <SelectTrigger
              aria-label="เรียงตาม"
              className="h-9 min-w-0 flex-1 rounded-full border-border/50 bg-transparent text-xs sm:w-[10.5rem] sm:flex-none"
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
          {actions}
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
