import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PROJECT_MANAGE_SORT_OPTIONS,
  projectManageSortLabel,
  type ProjectManageSortMode,
} from "@/lib/portfolioManageSort";

type Props = {
  value: ProjectManageSortMode;
  onChange: (value: ProjectManageSortMode) => void;
  className?: string;
};

export default function ProjectManageSortSelect({ value, onChange, className }: Props) {
  const label = projectManageSortLabel(value);

  return (
    <Select value={value} onValueChange={(next) => onChange(next as ProjectManageSortMode)}>
      <SelectTrigger
        aria-label={`เรียงตาม: ${label}`}
        className={cn(
          "h-9 w-9 px-0 justify-center gap-0 rounded-full text-xs",
          "border-0 bg-transparent shadow-none hover:bg-secondary/60",
          "focus:ring-0 focus:ring-offset-0",
          "[&>span]:sr-only [&>svg:last-child]:hidden",
          className,
        )}
      >
        <ArrowUpDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <SelectValue className="sr-only">{label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-72">
        {PROJECT_MANAGE_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-sm">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
