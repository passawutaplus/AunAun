import { Search, SlidersHorizontal, X } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  filterContent?: ReactNode;
  filterCount?: number;
  compact?: boolean;
  /** Mobile: show search icon only until tapped */
  expandable?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * When set, filter button opens this callback instead of the popover.
   * Use with a dedicated search/filter sheet.
   */
  onFilterClick?: () => void;
  /**
   * When set with expandable, tapping the collapsed search icon opens
   * this callback (e.g. mobile search sheet) instead of expanding inline.
   */
  onExpandClick?: () => void;
}

const SearchBar = ({
  placeholder = "Find inspiration or creators",
  value,
  onChange,
  filterContent,
  filterCount = 0,
  compact = false,
  expandable = false,
  onExpandedChange,
  onFilterClick,
  onExpandClick,
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(() => value.length > 0);
  const sheetMode = Boolean(onExpandClick);
  const isOpen = sheetMode ? false : !expandable || expanded || value.length > 0;

  useEffect(() => {
    if (sheetMode) {
      onExpandedChange?.(false);
      return;
    }
    onExpandedChange?.(isOpen);
  }, [isOpen, onExpandedChange, sheetMode]);

  useEffect(() => {
    if (!expandable || !expanded || sheetMode) return;
    inputRef.current?.focus();
  }, [expanded, expandable, sheetMode]);

  const collapse = () => {
    if (!expandable || value.length > 0 || sheetMode) return;
    setExpanded(false);
  };

  const filterButton =
    onFilterClick || filterContent ? (
      onFilterClick ? (
        <button
          type="button"
          onClick={onFilterClick}
          className="relative p-1.5 rounded-lg hover:bg-secondary transition-colors"
          aria-label="ตัวกรอง"
        >
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative p-1.5 rounded-lg hover:bg-secondary transition-colors"
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
      )
    ) : null;

  if (expandable && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          if (onExpandClick) {
            onExpandClick();
            return;
          }
          setExpanded(true);
        }}
        aria-label={placeholder}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0"
      >
        <Search className="w-4 h-4" aria-hidden />
        {filterCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <div className="relative" data-search-bar>
      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
          compact ? "w-3.5 h-3.5" : "w-4 h-4 left-4",
        )}
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const next = e.relatedTarget as HTMLElement | null;
          if (next?.closest("[data-search-bar]")) return;
          collapse();
        }}
        className={cn(
          "w-full rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow",
          compact ? "pl-9 pr-10 py-2" : "pl-11 pr-12 py-3",
          expandable && "pr-16",
        )}
      />
      {expandable ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value.length === 0 && !onExpandClick && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="ปิดค้นหา"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {filterButton}
        </div>
      ) : (
        filterButton && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{filterButton}</div>
        )
      )}
    </div>
  );
};

export default SearchBar;
