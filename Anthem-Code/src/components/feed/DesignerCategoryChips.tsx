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
  /** Wrap onto as many lines as needed, packed to this edge. */
  align?: "start" | "end" | "center";
  /** When set with align="end", split into this many right-aligned lines. */
  rows?: number;
};

function splitEven<T>(items: readonly T[], rows: number): T[][] {
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

const DesignerCategoryChips = ({
  selected,
  onSelect,
  chips = DEFAULT_CHIPS,
  className,
  align = "start",
  rows,
}: Props) => {
  const chipButton = (cat: Category | "All") => (
    <SlidingChip
      key={cat}
      layoutGroupId={GROUP_ID}
      label={cat === "All" ? "ทั้งหมด" : cat}
      active={selected === cat}
      onClick={() => onSelect(cat)}
    />
  );

  if (align === "end") {
    const lines = rows && rows > 1 ? splitEven(chips, rows) : [chips];
    return (
      <SlidingChipRail layoutGroupId={GROUP_ID} className={className}>
        <div className="flex w-full flex-col items-end gap-y-1">
          {lines.map((line) => (
            <div key={line.join("-")} className="flex max-w-full items-center justify-end gap-x-5">
              {line.map(chipButton)}
            </div>
          ))}
        </div>
      </SlidingChipRail>
    );
  }

  if (align === "center") {
    return (
      <SlidingChipRail layoutGroupId={GROUP_ID} className={className}>
        <div className="flex w-max max-w-full items-center justify-center gap-5 overflow-x-auto scrollbar-hide sm:gap-6">
          {chips.map(chipButton)}
        </div>
      </SlidingChipRail>
    );
  }

  return (
    <SlidingChipRail layoutGroupId={GROUP_ID}>
      <HorizontalScrollRail className={cn("flex items-center gap-5 sm:gap-6 pb-0", className)}>
        {chips.map(chipButton)}
      </HorizontalScrollRail>
    </SlidingChipRail>
  );
};

export default DesignerCategoryChips;
