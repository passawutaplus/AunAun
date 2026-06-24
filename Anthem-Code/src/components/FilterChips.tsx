import type { Category } from "@/data/projectTypes";
import type { ProjectChipFilter } from "@/lib/drillProject";
import { cn } from "@/lib/utils";

interface FilterChipsProps {
  categories: ProjectChipFilter[];
  selected: ProjectChipFilter;
  onSelect: (cat: ProjectChipFilter) => void;
}

const FilterChips = ({ categories, selected, onSelect }: FilterChipsProps) => {
  return (
    <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => {
        const active = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              "relative whitespace-nowrap text-sm font-medium py-1.5 transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
            {active && (
              <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FilterChips;
