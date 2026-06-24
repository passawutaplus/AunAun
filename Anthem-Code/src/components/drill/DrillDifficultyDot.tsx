import type { DrillDifficulty } from "@/data/designDrillPrompts.vendored";
import { cn } from "@/lib/utils";

const DOT_CLASS: Record<DrillDifficulty, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-400",
  hard: "bg-red-500",
};

export function DrillDifficultyDot({
  difficulty,
  className = "h-2.5 w-2.5",
}: {
  difficulty: DrillDifficulty;
  className?: string;
}) {
  return (
    <span
      className={cn("rounded-full shrink-0", DOT_CLASS[difficulty], className)}
      aria-hidden
    />
  );
}
