import { Search, SlidersHorizontal } from "lucide-react";
import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  filterContent?: ReactNode;
  filterCount?: number;
  compact?: boolean;
}

const SearchBar = ({
  placeholder = "Find inspiration or creators",
  value,
  onChange,
  filterContent,
  filterCount = 0,
  compact = false,
}: SearchBarProps) => {
  return (
    <div className="relative">
      <Search className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
        compact ? "w-3.5 h-3.5" : "w-4 h-4 left-4",
      )} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow",
          compact ? "pl-9 pr-10 py-2" : "pl-11 pr-12 py-3",
        )}
      />
      {filterContent && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="ตัวกรอง"
            >
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              {filterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm rounded-2xl p-4 glass-panel max-h-[70vh] overflow-y-auto overscroll-contain"
          >
            {filterContent}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default SearchBar;
