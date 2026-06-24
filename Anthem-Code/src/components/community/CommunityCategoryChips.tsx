import { categories } from "@/data/projectTypes";
import { cn } from "@/lib/utils";

const WORK_CATEGORIES = categories.filter((c) => c !== "Explore");

type Props = {
  selected: string;
  onSelect: (category: string) => void;
  className?: string;
};

const CommunityCategoryChips = ({ selected, onSelect, className }: Props) => (
  <div
    className={cn(
      "flex items-center gap-5 sm:gap-6 overflow-x-auto pb-0 scrollbar-hide",
      className,
    )}
  >
    <Chip active={selected === "All"} onClick={() => onSelect("All")} label="ทั้งหมด" />
    {WORK_CATEGORIES.map((cat) => (
      <Chip key={cat} active={selected === cat} onClick={() => onSelect(cat)} label={cat} />
    ))}
  </div>
);

const Chip = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "relative shrink-0 whitespace-nowrap text-sm font-medium py-1.5 transition-colors",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {label}
    {active && (
      <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-primary rounded-full" />
    )}
  </button>
);

export default CommunityCategoryChips;
