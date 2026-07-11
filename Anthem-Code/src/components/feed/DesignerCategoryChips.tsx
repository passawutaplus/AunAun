import { categories } from "@/data/projectTypes";
import type { Category } from "@/data/projectTypes";
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import { SlidingChip, SlidingChipRail } from "@/components/ui/SlidingChip";
import { cn } from "@/lib/utils";

const DEFAULT_CHIPS = ["All", ...categories.filter((c) => c !== "Explore")] as const;
const GROUP_ID = "designer-category-chips";

type Props = {
  selected: Category | "All";
  onSelect: (category: Category | "All") => void;
  chips?: readonly (Category | "All")[];
  className?: string;
};

const DesignerCategoryChips = ({
  selected,
  onSelect,
  chips = DEFAULT_CHIPS,
  className,
}: Props) => (
  <SlidingChipRail layoutGroupId={GROUP_ID}>
    <HorizontalScrollRail className={cn("flex items-center gap-5 sm:gap-6 pb-0", className)}>
      {chips.map((cat) => (
        <SlidingChip
          key={cat}
          layoutGroupId={GROUP_ID}
          label={cat === "All" ? "ทั้งหมด" : cat}
          active={selected === cat}
          onClick={() => onSelect(cat)}
        />
      ))}
    </HorizontalScrollRail>
  </SlidingChipRail>
);

export default DesignerCategoryChips;
