import { useState, type ReactNode } from "react";
import { Check, LayoutGrid, LayoutList, Rows3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";

type DensityOption = {
  value: SeriesWorksDensity;
  label: string;
  icon: ReactNode;
};

const OPTIONS: DensityOption[] = [
  {
    value: "large",
    label: "ใหญ่",
    icon: (
      <span className="inline-grid grid-cols-2 gap-px" aria-hidden>
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
      </span>
    ),
  },
  {
    value: "medium",
    label: "กลาง",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    value: "small",
    label: "เล็ก",
    icon: <Rows3 className="h-4 w-4" />,
  },
  {
    value: "list",
    label: "รายการ",
    icon: <LayoutList className="h-4 w-4" />,
  },
];

type Props = {
  value: SeriesWorksDensity;
  onChange: (value: SeriesWorksDensity) => void;
  className?: string;
};

export function SeriesDensitySelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[1];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`รูปแบบกริด: ${current.label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground shrink-0 transition-colors",
            "border-0 bg-transparent hover:bg-secondary/60",
            className,
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5" sideOffset={8}>
        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">รูปแบบกริด</p>
        <div className="flex flex-col gap-0.5" role="listbox" aria-label="เลือกรูปแบบกริด">
          {OPTIONS.map(({ value: optionValue, label, icon }) => {
            const active = value === optionValue;
            return (
              <button
                key={optionValue}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                  active ? "bg-primary/10 text-foreground" : "hover:bg-secondary text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border",
                    active
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {icon}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{label}</span>
                {active ? <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
