import DesignerCategoryChips from "@/components/feed/DesignerCategoryChips";
import {
  DESIGNER_FEED_LABELS,
  DESIGNER_FEED_ORDER,
  type DesignerFeedSource,
} from "@/components/feed/DesignerFeedDropdown";
import type { Category } from "@/data/projectTypes";
import type { DesignerSort } from "@/components/feed/DesignerToolbar";
import { FilterPanel } from "@/components/feed/DesignerToolbar";

type Props = {
  feedSource: DesignerFeedSource;
  onFeedSourceChange: (source: DesignerFeedSource) => void;
  sort: DesignerSort;
  onSort: (s: DesignerSort) => void;
  tools: string[];
  selectedTools: string[];
  onToggleTool: (t: string) => void;
  category: Category | "All";
  onCategoryChange: (c: Category | "All") => void;
  categoryChips: (Category | "All")[];
  onClear: () => void;
};

/** Feed source, sort, tools, categories — mobile filter popover on Designers tab. */
const DesignerFilterPanel = ({
  feedSource,
  onFeedSourceChange,
  sort,
  onSort,
  tools,
  selectedTools,
  onToggleTool,
  category,
  onCategoryChange,
  categoryChips,
  onClear,
}: Props) => (
  <div className="space-y-4">
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">โหมดฟีด</p>
      <div className="flex flex-wrap gap-1.5">
        {DESIGNER_FEED_ORDER.map((opt) => {
          const active = feedSource === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onFeedSourceChange(opt)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {DESIGNER_FEED_LABELS[opt]}
            </button>
          );
        })}
      </div>
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">หมวดหมู่</p>
      <DesignerCategoryChips selected={category} onSelect={onCategoryChange} chips={categoryChips} />
    </div>
    <FilterPanel
      sort={sort}
      onSort={onSort}
      tools={tools}
      selectedTools={selectedTools}
      onToggleTool={onToggleTool}
      showTools
      showCategories={false}
      onClear={onClear}
    />
  </div>
);

export default DesignerFilterPanel;
