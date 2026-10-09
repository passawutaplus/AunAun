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
  /** Wrap onto as many lines as needed, packed to this edge. */
  align?: "start" | "end" | "center";
  /** When set with align="end", split into this many right-aligned lines. */
  rows?: number;
}

const GROUP_ID = "feed-filter-chips";

function splitEven<T>(items: T[], rows: number): T[][] {
  const base = Math.floor(items.length / rows);
  const extra = items.length % rows;
  const lines: T[][] = [];
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    const count = base + (row < extra ? 1 : 0);
    if (count === 0) continue;
    lines.push(items.slice(index, index + count));
    index += count;
  }
  return lines;
}

const FilterChips = ({ options, selected, onSelect, categories, align = "start", rows }: FilterChipsProps) => {
  const chips: FilterChipOption[] =
    options && options.length > 0
      ? options
      : (categories ?? []).map((c) => ({
          id: c,
          label: c === "All" ? "All" : c,
        }));

  const chipButton = (chip: FilterChipOption) => (
    <SlidingChip
      key={chip.id}
      layoutGroupId={GROUP_ID}
      label={chip.label}
      active={selected === chip.id}
      onClick={() => onSelect(chip.id)}
    />
  );

  if (align === "end") {
    const lines = rows && rows > 1 ? splitEven(chips, rows) : [chips];
    return (
      <SlidingChipRail layoutGroupId={GROUP_ID}>
        <div className="flex w-full flex-col items-end gap-y-1">
          {lines.map((line) => (
            <div
              key={line.map((chip) => chip.id).join("-")}
              className="flex max-w-full items-center justify-end gap-x-5"
            >
              {line.map(chipButton)}
            </div>
          ))}
        </div>
      </SlidingChipRail>
    );
  }

  if (align === "center") {
    return (
      <SlidingChipRail layoutGroupId={GROUP_ID}>
        <div className="flex w-max max-w-full items-center justify-center gap-5 overflow-x-auto pb-1 scrollbar-hide sm:gap-6">
          {chips.map(chipButton)}
        </div>
      </SlidingChipRail>
    );
  }

  return (
    <SlidingChipRail layoutGroupId={GROUP_ID}>
      <HorizontalScrollRail className="flex items-center gap-5 sm:gap-6 pb-1">
        {chips.map(chipButton)}
      </HorizontalScrollRail>
    </SlidingChipRail>
  );
};

export default FilterChips;
