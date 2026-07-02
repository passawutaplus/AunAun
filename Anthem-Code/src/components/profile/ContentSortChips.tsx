import { Clock, TrendingUp } from "lucide-react";
import type { ProfileContentSort } from "@/lib/contentSort";
import { cn } from "@/lib/utils";

type Props = {
  value: ProfileContentSort;
  onChange: (mode: ProfileContentSort) => void;
  className?: string;
};

const OPTIONS: { key: ProfileContentSort; label: string; Icon: typeof Clock }[] = [
  { key: "newest", label: "ล่าสุด", Icon: Clock },
  { key: "popular", label: "ยอดนิยม", Icon: TrendingUp },
];

export function ContentSortChips({ value, onChange, className }: Props) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1", className)}>
      {OPTIONS.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border whitespace-nowrap shrink-0 transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
