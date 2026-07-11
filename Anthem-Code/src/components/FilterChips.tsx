import type { ProjectChipFilter } from "@/lib/drillProject";
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import { SlidingChip, SlidingChipRail } from "@/components/ui/SlidingChip";

interface FilterChipsProps {
  categories: ProjectChipFilter[];
  selected: ProjectChipFilter;
  onSelect: (cat: ProjectChipFilter) => void;
}

const GROUP_ID = "feed-filter-chips";

const FilterChips = ({ categories, selected, onSelect }: FilterChipsProps) => {
  return (
    <SlidingChipRail layoutGroupId={GROUP_ID}>
      <HorizontalScrollRail className="flex items-center gap-5 sm:gap-6 pb-1">
        {categories.map((cat) => (
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
};

export default FilterChips;
