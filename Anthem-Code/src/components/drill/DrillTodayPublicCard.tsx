import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import {
  DRILL_DIFFICULTY_META,
} from "@/data/designDrillPrompts.vendored";
import { pickDailyDrill } from "@/lib/designDrillPick.vendored";
import { projectsDrillFeedUrl } from "@/lib/drillProject";
import { DrillDifficultyDot } from "./DrillDifficultyDot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Read-only today's drill for public profiles. */
export function DrillTodayPublicCard() {
  const drill = pickDailyDrill();

  return (
    <div className="rounded-2xl glass-panel p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-bold">Design Drill วันนี้</h3>
        <Badge variant="outline" className="text-[10px] ml-auto">
          Aplus1 Daily Brief
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{drill.meta.label}</Badge>
        <Badge variant="outline" className="gap-1.5">
          <DrillDifficultyDot difficulty={drill.difficulty} />
          {DRILL_DIFFICULTY_META[drill.difficulty].label}
        </Badge>
      </div>
      <p className="text-sm font-semibold leading-snug">{drill.brief}</p>
      <Button variant="outline" size="sm" asChild className="rounded-full">
        <Link to={projectsDrillFeedUrl()}>ดูผลงานวันนี้</Link>
      </Button>
    </div>
  );
}
