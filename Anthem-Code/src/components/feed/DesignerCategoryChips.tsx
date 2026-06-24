import { categories } from "@/data/projectTypes";
import type { Category } from "@/data/projectTypes";
import { cn } from "@/lib/utils";

const DEFAULT_CHIPS = ["All", ...categories.filter((c) => c !== "Explore")] as const;

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
  <div
    className={cn(
      "flex items-center gap-5 sm:gap-6 overflow-x-auto pb-0 scrollbar-hide",
      className,
    )}
  >
    {chips.map((cat) => {
      const active = selected === cat;
      return (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={cn(
            "relative shrink-0 whitespace-nowrap text-sm font-medium py-1.5 transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {cat === "All" ? "ทั้งหมด" : cat}
          {active && (
            <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      );
    })}
  </div>
);

export default DesignerCategoryChips;
