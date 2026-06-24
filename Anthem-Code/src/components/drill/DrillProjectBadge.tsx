import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DAILY_DRILL_BADGE_LABEL,
  DRILL_BADGE_LABEL,
  projectHasDailyDrillTag,
  projectHasDrillTag,
} from "@/lib/drillProject";

type Props = {
  tags?: string[] | null;
  className?: string;
  size?: "sm" | "md";
};

export function DrillProjectBadge({ tags, className, size = "sm" }: Props) {
  if (!projectHasDrillTag(tags)) return null;
  const isDaily = projectHasDailyDrillTag(tags);
  const label = isDaily ? DAILY_DRILL_BADGE_LABEL : DRILL_BADGE_LABEL;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-primary/40 bg-primary/10 text-primary hover:bg-primary/10 shrink-0",
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs",
        className,
      )}
    >
      <Target className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
      {label}
    </Badge>
  );
}
