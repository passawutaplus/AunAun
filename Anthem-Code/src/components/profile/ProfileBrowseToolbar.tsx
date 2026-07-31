import { Check, ListFilter } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SeriesDensitySelect } from "@/components/series/SeriesDensitySelect";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";
import { cn } from "@/lib/utils";

export type ProfileBrowseFilterOption = {
  value: string;
  label: string;
};

type Props = {
  filterValue: string;
  filterOptions: ProfileBrowseFilterOption[];
  onFilterChange: (value: string) => void;
  filterLabel?: string;
  density: SeriesWorksDensity;
  onDensityChange: (value: SeriesWorksDensity) => void;
  className?: string;
};

/** Compact filter + grid density controls for public profile Works / Catalog. */
export function ProfileBrowseToolbar({
  filterValue,
  filterOptions,
  onFilterChange,
  filterLabel = "ตัวกรอง",
  density,
  onDensityChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const active = filterOptions.find((o) => o.value === filterValue) ?? filterOptions[0];
  const hasAllOption = filterOptions.some((o) => o.value === "all");
  const filtered = hasAllOption && filterValue !== "all" && filterValue !== "";

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${filterLabel}: ${active?.label ?? "ทั้งหมด"}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0 transition-colors",
              "border-0 bg-transparent hover:bg-secondary/60",
              filtered && "text-primary",
            )}
          >
            <ListFilter className="w-3.5 h-3.5" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1.5" sideOffset={8}>
          <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">{filterLabel}</p>
          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto" role="listbox">
            {filterOptions.map((opt) => {
              const selected = opt.value === filterValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onFilterChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    selected ? "bg-primary/10 text-foreground" : "hover:bg-secondary text-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{opt.label}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <SeriesDensitySelect value={density} onChange={onDensityChange} />
    </div>
  );
}
