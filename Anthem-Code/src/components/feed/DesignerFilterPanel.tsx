import DesignerCategoryChips from "@/components/feed/DesignerCategoryChips";
import type { Category } from "@/data/projectTypes";
import type { DesignerSort } from "@/components/feed/DesignerToolbar";
import { FilterPanel } from "@/components/feed/DesignerToolbar";

type Props = {
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

/** Sort, tools, categories — mobile filter popover on Designers tab. */
const DesignerFilterPanel = ({
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
