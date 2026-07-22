import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import { SlidingChip, SlidingChipRail } from "@/components/ui/SlidingChip";

export type FilterChipOption = {
  id: string;
  label: string;
};

interface FilterChipsProps {
  options?: FilterChipOption[];
  selected: string;
  onSelect: (id: string) => void;
  /** Legacy: raw id list (label = id, All → ทั้งหมด) */
  categories?: string[];
}

const GROUP_ID = "feed-filter-chips";

const FilterChips = ({ options, selected, onSelect, categories }: FilterChipsProps) => {
  const chips: FilterChipOption[] =
    options && options.length > 0
      ? options
      : (categories ?? []).map((c) => ({
          id: c,
          label: c === "All" ? "All" : c,
        }));

  return (
    <SlidingChipRail layoutGroupId={GROUP_ID}>
      <HorizontalScrollRail className="flex items-center gap-5 sm:gap-6 pb-1">
        {chips.map((chip) => (
          <SlidingChip
            key={chip.id}
            layoutGroupId={GROUP_ID}
            label={chip.label}
            active={selected === chip.id}
            onClick={() => onSelect(chip.id)}
          />
        ))}
      </HorizontalScrollRail>
    </SlidingChipRail>
  );
};

export default FilterChips;
