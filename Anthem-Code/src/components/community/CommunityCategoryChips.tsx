import { categories } from "@/data/projectTypes";
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import { SlidingChip, SlidingChipRail } from "@/components/ui/SlidingChip";
import { cn } from "@/lib/utils";

const WORK_CATEGORIES = categories.filter((c) => c !== "Explore");
const GROUP_ID = "community-category-chips";

type Props = {
  selected: string;
  onSelect: (category: string) => void;
  className?: string;
};

const CommunityCategoryChips = ({ selected, onSelect, className }: Props) => (
  <SlidingChipRail layoutGroupId={GROUP_ID}>
    <HorizontalScrollRail className={cn("flex items-center gap-5 sm:gap-6 pb-0", className)}>
      <SlidingChip
        layoutGroupId={GROUP_ID}
        label="ทั้งหมด"
        active={selected === "All"}
        onClick={() => onSelect("All")}
      />
      {WORK_CATEGORIES.map((cat) => (
        <SlidingChip
          key={cat}
          layoutGroupId={GROUP_ID}
          label={cat}
          active={selected === cat}
          onClick={() => onSelect(cat)}
        />
      ))}
    </HorizontalScrollRail>
  </SlidingChipRail>
);

export default CommunityCategoryChips;
