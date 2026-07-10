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
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ProjectManageSortMode)}>
      <SelectTrigger
        className={cn(
          "h-9 w-auto min-w-[8.5rem] max-w-[11rem] rounded-full border-border bg-card text-xs gap-1.5 px-3",
          className,
        )}
      >
        <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
        <SelectValue placeholder="เรียงตาม">{projectManageSortLabel(value)}</SelectValue>
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
