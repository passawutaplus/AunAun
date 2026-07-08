import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, Play } from "lucide-react";
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
import { difficultyDisplayLabel, getDrillDisplayCopy } from "@/lib/drillDisplayCopy";
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
  const display = useMemo(() => getDrillDisplayCopy(dailyDrill), [dailyDrill]);
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

  const mobilePreviewImage = (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10 shadow-sm md:hidden">
      <img
        src={display.previewImage}
        alt=""
        className="aspect-[4/5] w-full object-contain"
        loading="lazy"
      />
    </div>
  );

  const desktopPreviewImage = (
    <div className="hidden md:block md:w-[220px] md:shrink-0 md:justify-self-end lg:w-[240px]">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10 shadow-sm">
        <img
          src={display.previewImage}
          alt=""
          className="aspect-[3/4] w-full max-h-[260px] object-cover"
          loading="lazy"
        />
      </div>
    </div>
  );

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6 lg:gap-8">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{dailyDrill.meta.label}</Badge>
            <Badge variant="outline" className="gap-1.5">
              <DrillDifficultyDot difficulty={dailyDrill.difficulty} />
              {difficultyDisplayLabel(DRILL_DIFFICULTY_META[dailyDrill.difficulty].label)}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold leading-snug sm:text-lg">{display.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{display.description}</p>
          </div>

          {mobilePreviewImage}

          {display.deliverables.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 space-y-2">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
                สิ่งที่ควรมี
              </p>
              <ul className="space-y-1.5 text-sm text-foreground/90">
                {display.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inProgress && drillMatchesProgress && timerStartedAt != null && (
            <DrillCountdown startedAt={timerStartedAt} totalMinutes={timerTotalMinutes} />
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!inProgress && !completedToday && (
              <Button onClick={handleStart} className="gap-1.5 rounded-full">
                <Play className="h-3.5 w-3.5" aria-hidden />
                เริ่มทำโจทย์นี้
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
            <p className="text-xs text-primary font-medium">ทำโจทย์วันนี้เสร็จแล้ว — เก่งมาก!</p>
          )}
        </div>

        {desktopPreviewImage}
      </div>
    </div>
  );
}
