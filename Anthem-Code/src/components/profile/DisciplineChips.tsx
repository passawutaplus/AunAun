import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WORK_DISCIPLINE_LABELS, type WorkDisciplineId } from "@/data/workDisciplineOptions";

type Props = {
  disciplines?: string[] | null;
  className?: string;
  size?: "sm" | "md";
};

/** สายงาน chips under opportunity status on profile cover. */
export default function DisciplineChips({ disciplines, className, size = "sm" }: Props) {
  const items = (disciplines ?? []).map((id) => id.trim()).filter(Boolean);
  if (!items.length) return null;

  const badgeClass =
    size === "sm"
      ? "rounded-full text-xs font-normal border border-border/70 bg-secondary text-foreground"
      : "rounded-full text-sm font-normal border border-border/70 bg-secondary text-foreground";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((id) => (
        <Badge key={id} variant="outline" className={badgeClass}>
          {WORK_DISCIPLINE_LABELS[id as WorkDisciplineId] ?? id}
        </Badge>
      ))}
    </div>
  );
}
