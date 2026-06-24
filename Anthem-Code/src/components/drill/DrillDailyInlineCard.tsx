import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Play } from "lucide-react";
import { DRILL_DIFFICULTY_META } from "@/data/designDrillPrompts.vendored";
import {
  buildDrillDescription,
  buildDrillTags,
  pickDailyDrill,
  type PickedDrill,
} from "@/lib/designDrillPick.vendored";
import {
  clearDrillInProgress,
  getDrillInProgress,
  isDrillCompletedToday,
  markDrillCompleted,
  markDrillStarted,
} from "@/lib/designDrillStorage";
import { parseTimeHintToMinutes } from "@/lib/parseTimeHint.vendored";
import { todayISO } from "@/lib/dailySeedPick.vendored";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrillCountdown } from "./DrillCountdown";
import { DrillDifficultyDot } from "./DrillDifficultyDot";

function buildPostSearchParams(drill: PickedDrill): string {
  const tags = buildDrillTags(drill, { daily: true });
  const params = new URLSearchParams({
    from: "so1o",
    title: drill.brief.slice(0, 120),
    description: buildDrillDescription(drill).slice(0, 4000),
    category: drill.meta.anthemCategory,
    tags: tags.join(","),
    drill_type: "daily",
    drill_date: todayISO(),
  });
  return params.toString();
}

type Props = {
  className?: string;
};

/** Daily drill challenge with inline start — no redirect to portfolio. */
export function DrillDailyInlineCard({ className }: Props) {
  const navigate = useNavigate();
  const dailyDrill = useMemo(() => pickDailyDrill(), []);
  const [progressTick, setProgressTick] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [savedBrief, setSavedBrief] = useState<string | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerTotalMinutes, setTimerTotalMinutes] = useState(90);

  useEffect(() => {
    setCompletedToday(isDrillCompletedToday());
    const saved = getDrillInProgress();
    if (saved) {
      setInProgress(true);
      setSavedBrief(saved.brief);
      setTimerStartedAt(saved.startedAt ?? null);
      setTimerTotalMinutes(saved.totalMinutes ?? 90);
    } else {
      setTimerStartedAt(null);
    }
  }, [progressTick]);

  const drillMatchesProgress = !inProgress || savedBrief === dailyDrill.brief;

  const handleStart = () => {
    const totalMinutes = parseTimeHintToMinutes(
      dailyDrill.template.timeHint,
      dailyDrill.difficulty,
    );
    markDrillStarted(dailyDrill.brief, totalMinutes);
    setInProgress(true);
    setSavedBrief(dailyDrill.brief);
    setTimerStartedAt(Date.now());
    setTimerTotalMinutes(totalMinutes);
    setProgressTick((t) => t + 1);
  };

  const handleComplete = () => {
    markDrillCompleted();
    setInProgress(false);
    setCompletedToday(true);
    setTimerStartedAt(null);
    setProgressTick((t) => t + 1);
  };

  const handlePost = () => {
    navigate(`/portfolio/new?${buildPostSearchParams(dailyDrill)}`);
  };

  const handleReset = () => {
    clearDrillInProgress();
    setInProgress(false);
    setSavedBrief(null);
    setTimerStartedAt(null);
    setProgressTick((t) => t + 1);
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary">{dailyDrill.meta.label}</Badge>
        <Badge variant="outline" className="gap-1.5">
          <DrillDifficultyDot difficulty={dailyDrill.difficulty} />
          {DRILL_DIFFICULTY_META[dailyDrill.difficulty].label}
        </Badge>
      </div>

      <p className="text-base font-semibold leading-snug">{dailyDrill.brief}</p>

      {dailyDrill.constraints.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {dailyDrill.constraints.map((c) => (
            <li key={c} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
              {c}
            </li>
          ))}
        </ul>
      )}

      {inProgress && drillMatchesProgress && timerStartedAt != null && (
        <div className="mt-4">
          <DrillCountdown startedAt={timerStartedAt} totalMinutes={timerTotalMinutes} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-4">
        {!inProgress && !completedToday && (
          <Button onClick={handleStart} className="gap-1.5 rounded-full">
            <Play className="h-3.5 w-3.5" aria-hidden />
            เริ่มทำ
          </Button>
        )}
        {inProgress && drillMatchesProgress && (
          <>
            <Button onClick={handleComplete} className="gap-1.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ทำเสร็จแล้ว
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              ยกเลิก
            </Button>
          </>
        )}
        {((inProgress && drillMatchesProgress) || completedToday) && (
          <Button variant="outline" onClick={handlePost} className="gap-1.5 rounded-full">
            โพสผลงาน
          </Button>
        )}
      </div>

      {completedToday && (
        <p className="mt-3 text-xs text-primary font-medium">ทำโจทย์วันนี้เสร็จแล้ว — เก่งมาก!</p>
      )}
    </div>
  );
}
