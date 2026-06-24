import { ArrowDownUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Category } from "@/data/projectTypes";
import type { ProjectChipFilter } from "@/lib/drillProject";

export type DesignerSort = "newest" | "projects" | "views";

export const SORT_LABELS: Record<DesignerSort, string> = {
  newest: "ล่าสุด",
  projects: "ผลงานมากสุด",
  views: "วิวมากสุด",
};

interface FilterPanelProps {
  sort: DesignerSort;
  onSort: (s: DesignerSort) => void;
  tools?: string[];
  selectedTools?: string[];
  onToggleTool?: (t: string) => void;
  onClear: () => void;
  showTools?: boolean;
  categories?: ProjectChipFilter[];
  selectedCategory?: ProjectChipFilter;
  onCategorySelect?: (c: ProjectChipFilter) => void;
  showCategories?: boolean;
  feedModes?: { value: string; label: string }[];
  selectedFeedMode?: string;
  onFeedModeSelect?: (v: string) => void;
  showFeedModes?: boolean;
}

export const FilterPanel = ({
  sort,
  onSort,
  tools = [],
  selectedTools = [],
  onToggleTool,
  onClear,
  showTools = true,
  categories = [],
  selectedCategory = "All",
  onCategorySelect,
  showCategories = false,
  feedModes = [],
  selectedFeedMode,
  onFeedModeSelect,
  showFeedModes = false,
}: FilterPanelProps) => {
  const activeCount =
    (sort !== "newest" && showTools ? 1 : 0) +
    (showTools ? selectedTools.length : 0) +
    (showCategories && selectedCategory !== "All" ? 1 : 0) +
    (showFeedModes && selectedFeedMode && selectedFeedMode !== "Explore" ? 1 : 0);

  return (
    <div className="space-y-4">
      {showFeedModes && feedModes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">โหมดฟีด</p>
          <div className="flex flex-wrap gap-1.5">
            {feedModes.map(({ value, label }) => {
              const active = selectedFeedMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFeedModeSelect?.(value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCategories && categories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">หมวดหมู่</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const active = selectedCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCategorySelect?.(c)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showTools && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <ArrowDownUp className="w-3 h-3" /> เรียงตาม
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SORT_LABELS) as DesignerSort[]).map((k) => {
              const active = sort === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onSort(k)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {SORT_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showTools && tools.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">เครื่องมือ</p>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto overscroll-contain pr-1 -mr-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {tools.map((t) => {
              const active = selectedTools.includes(t);
              return (
                <label
                  key={t}
                  className="flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={active}
                    onCheckedChange={() => onToggleTool?.(t)}
                  />
                  <span>{t}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 w-full rounded-full text-xs text-muted-foreground gap-1"
        >
          <X className="w-3 h-3" /> ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
};

export default FilterPanel;
