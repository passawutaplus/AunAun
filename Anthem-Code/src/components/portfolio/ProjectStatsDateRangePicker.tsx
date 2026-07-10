import { useEffect, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROJECT_STATS_DATE_RANGE,
  getProjectStatsRangeBounds,
  projectStatsRangeLabel,
  type ProjectStatsDateRange,
  type ProjectStatsRangePreset,
} from "@/lib/projectStatsDateRange";

type Props = {
  value: ProjectStatsDateRange;
  onChange: (next: ProjectStatsDateRange) => void;
  className?: string;
};

const PRESETS: { id: ProjectStatsRangePreset; label: string }[] = [
  { id: "today", label: "วันนี้" },
  { id: "7d", label: "7 วัน" },
  { id: "30d", label: "30 วัน" },
];

export default function ProjectStatsDateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.customFrom ?? "");
  const [draftTo, setDraftTo] = useState(value.customTo ?? "");

  useEffect(() => {
    if (!open) return;
    setDraftFrom(value.customFrom ?? "");
    setDraftTo(value.customTo ?? "");
  }, [open, value.customFrom, value.customTo]);

  const bounds = getProjectStatsRangeBounds(value);
  const label = projectStatsRangeLabel(value, bounds);

  const pickPreset = (preset: ProjectStatsRangePreset) => {
    onChange({ preset });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return;
    const next = { preset: "custom" as const, customFrom: draftFrom, customTo: draftTo };
    if (!getProjectStatsRangeBounds(next)) return;
    onChange(next);
    setOpen(false);
  };

  const customValid = !!getProjectStatsRangeBounds({
    preset: "custom",
    customFrom: draftFrom,
    customTo: draftTo,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 shrink-0 rounded-full px-2.5 text-[11px] font-normal gap-1 max-w-[9.5rem]",
            className,
          )}
        >
          <Calendar className="w-3 h-3 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={value.preset === preset.id ? "default" : "outline"}
              className="h-8 rounded-lg text-xs px-2"
              onClick={() => pickPreset(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            ตั้งแต่วันที่ – วันที่
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">ตั้งแต่</span>
              <Input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">ถึง</span>
              <Input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full h-8 rounded-lg text-xs"
            disabled={!customValid}
            onClick={applyCustom}
          >
            ใช้ช่วงนี้
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DEFAULT_PROJECT_STATS_DATE_RANGE };
