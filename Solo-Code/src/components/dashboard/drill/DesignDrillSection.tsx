import * as React from "react";
import {
  Target,
  Shuffle,
  ExternalLink,
  CheckCircle2,
  Play,
  Flame,
  Lock,
  Sparkles,
  ChevronDown,
  Loader2,
  Users,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DRILL_CATEGORY_META,
  DRILL_DIFFICULTY_META,
  type DrillCategory,
  type DrillDifficulty,
  type DrillMode,
} from "@/data/designDrillPrompts";
import {
  buildDrillDescription,
  buildDrillTags,
  pickDailyDrill,
  pickDrill,
  type PickedDrill,
} from "@/lib/designDrillPick";
import {
  clearDrillInProgress,
  getDrillInProgress,
  getDrillStreak,
  isDrillCompletedToday,
  markDrillCompleted,
  markDrillPostedToPixel100,
  markDrillStarted,
} from "@/lib/designDrillStorage";
import { parseTimeHintToMinutes } from "@/lib/parseTimeHint";
import { aplus1DesignDrillUrl, aplus1DrillGalleryUrl, trackCrossLink } from "@/lib/crossLink";
import { fetchDrillRerollStatus, requestDrillReroll } from "@/lib/designDrillReroll.functions";
import { saltToRollSeed } from "@/lib/drillRerollClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrillDifficultyDot } from "./DrillDifficultyDot";
import { DrillCountdown } from "./DrillCountdown";

type Tab = "daily" | "custom";

const CATEGORIES = Object.keys(DRILL_CATEGORY_META) as DrillCategory[];
const DIFFICULTIES = Object.keys(DRILL_DIFFICULTY_META) as DrillDifficulty[];

function ChipRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none ${className}`}>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-soft"
          : "bg-background text-muted-foreground border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

export function DesignDrillSection() {
  const [tab, setTab] = React.useState<Tab>("daily");
  const [category, setCategory] = React.useState<DrillCategory>("logo");
  const [difficulty, setDifficulty] = React.useState<DrillDifficulty>("medium");
  const [mode, setMode] = React.useState<DrillMode>("constraints");
  const [rollSeed, setRollSeed] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [progressTick, setProgressTick] = React.useState(0);
  const [inProgress, setInProgress] = React.useState(false);
  const [completedToday, setCompletedToday] = React.useState(false);
  const [savedBrief, setSavedBrief] = React.useState<string | null>(null);
  const [timerStartedAt, setTimerStartedAt] = React.useState<number | null>(null);
  const [timerTotalMinutes, setTimerTotalMinutes] = React.useState(90);
  const [rerollRemaining, setRerollRemaining] = React.useState<number | null>(null);
  const [rolling, setRolling] = React.useState(false);

  const fetchRerollStatusFn = useServerFn(fetchDrillRerollStatus);
  const requestRerollFn = useServerFn(requestDrillReroll);

  const refreshRerollStatus = React.useCallback(async () => {
    try {
      const s = await fetchRerollStatusFn();
      setRerollRemaining(s.remaining);
    } catch {
      setRerollRemaining(null);
    }
  }, [fetchRerollStatusFn]);

  React.useEffect(() => {
    setStreak(getDrillStreak());
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

  React.useEffect(() => {
    if (tab === "custom") refreshRerollStatus();
  }, [tab, refreshRerollStatus]);

  const dailyDrill = React.useMemo(() => pickDailyDrill(), []);

  const customDrill = React.useMemo(
    () => pickDrill({ category, difficulty, mode, salt: String(rollSeed) }),
    [category, difficulty, mode, rollSeed],
  );

  const activeDrill: PickedDrill = tab === "daily" ? dailyDrill : customDrill;
  const drillMatchesProgress = !inProgress || savedBrief === activeDrill.brief;

  React.useEffect(() => {
    if (!inProgress || savedBrief === activeDrill.brief) return;
    clearDrillInProgress();
    setInProgress(false);
    setSavedBrief(null);
  }, [tab, category, difficulty, mode, rollSeed, activeDrill.brief, inProgress, savedBrief]);

  const handleRoll = async () => {
    setRolling(true);
    try {
      const result = await requestRerollFn();
      setRollSeed(saltToRollSeed(result.salt));
      setRerollRemaining(result.remainingFree);
      if (result.paid) {
        toast.info(`ใช้ ${result.creditsUsed} AI credit สุ่มโจทย์ใหม่`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "สุ่มไม่สำเร็จ";
      toast.error(msg === "limit_reached" ? "เครดิต AI ไม่พอ — อัปเดตแพ็กเพื่อสุ่มต่อ" : msg);
    } finally {
      setRolling(false);
    }
  };

  const handleStart = () => {
    const totalMinutes = parseTimeHintToMinutes(
      activeDrill.template.timeHint,
      activeDrill.difficulty,
    );
    markDrillStarted(activeDrill.brief, totalMinutes);
    setInProgress(true);
    setSavedBrief(activeDrill.brief);
    setTimerStartedAt(Date.now());
    setTimerTotalMinutes(totalMinutes);
    setProgressTick((t) => t + 1);
    window.dispatchEvent(new CustomEvent("so1o:creative-path-update"));
  };

  const handleComplete = () => {
    markDrillCompleted();
    setInProgress(false);
    setCompletedToday(true);
    setTimerStartedAt(null);
    setStreak(getDrillStreak());
    setProgressTick((t) => t + 1);
    window.dispatchEvent(new CustomEvent("so1o:creative-path-update"));
  };

  const handlePost = async () => {
    const linkId = await trackCrossLink({
      source: "design_drill",
      meta: {
        category: activeDrill.category,
        difficulty: activeDrill.difficulty,
        mode: activeDrill.mode,
      },
    });

    const url = aplus1DesignDrillUrl({
      brief: activeDrill.brief,
      description: buildDrillDescription(activeDrill),
      aplus1Category: activeDrill.meta.anthemCategory,
      tags: buildDrillTags(activeDrill, { daily: tab === "daily" }),
      drillType: tab,
    });

    const withLink = linkId ? `${url}&link_id=${encodeURIComponent(linkId)}` : url;
    markDrillPostedToPixel100();
    window.dispatchEvent(new CustomEvent("so1o:creative-path-update"));
    window.open(withLink, "_blank", "noopener,noreferrer");
  };

  const handleReset = () => {
    clearDrillInProgress();
    setInProgress(false);
    setSavedBrief(null);
    setTimerStartedAt(null);
    setProgressTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-primary-soft text-primary p-2 shrink-0">
            <Target className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Design Drill</h2>
            <p className="text-xs text-muted-foreground">
              โจทย์ฝึกดีไซน์รายวัน → โพสผลงานที่ Aplus1
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Flame className="h-3 w-3" aria-hidden />
              {streak} วันติด
            </Badge>
          )}
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={aplus1DrillGalleryUrl()} target="_blank" rel="noopener noreferrer">
              <Users className="h-3.5 w-3.5" aria-hidden />
              ดูผลงานวันนี้
            </a>
          </Button>
        </div>
      </div>

      <ChipRow>
        {(["daily", "custom"] as Tab[]).map((t) => (
          <FilterChip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "daily" ? "โจทย์ประจำวัน" : "สุ่มเอง"}
          </FilterChip>
        ))}
      </ChipRow>

      {tab === "custom" && (
        <details className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
            <span>ตั้งค่าโจทย์</span>
            <ChevronDown
              className="h-4 w-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-3 space-y-3 pt-3 border-t border-border/60">
            <ChipRow>
              {CATEGORIES.map((c) => (
                <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {DRILL_CATEGORY_META[c].label}
                </FilterChip>
              ))}
            </ChipRow>
            <ChipRow>
              {DIFFICULTIES.map((d) => (
                <FilterChip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                  <span className="inline-flex items-center gap-1">
                    <DrillDifficultyDot difficulty={d} />
                    {DRILL_DIFFICULTY_META[d].label}
                  </span>
                </FilterChip>
              ))}
              {(["constraints", "free"] as DrillMode[]).map((m) => (
                <FilterChip key={m} active={mode === m} onClick={() => setMode(m)}>
                  <span className="inline-flex items-center gap-1">
                    {m === "constraints" ? (
                      <Lock className="h-3 w-3" aria-hidden />
                    ) : (
                      <Sparkles className="h-3 w-3" aria-hidden />
                    )}
                    {m === "constraints" ? "มีข้อจำกัด" : "ฟรีสไตล์"}
                  </span>
                </FilterChip>
              ))}
            </ChipRow>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRoll}
                disabled={rolling}
                className="gap-1.5"
              >
                {rolling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Shuffle className="h-3.5 w-3.5" aria-hidden />
                )}
                สุ่มโจทย์ใหม่
              </Button>
              {rerollRemaining != null && (
                <span className="text-[11px] text-muted-foreground">
                  {rerollRemaining > 0
                    ? `เหลือฟรีวันนี้ ${rerollRemaining}/3`
                    : "ครั้งถัดไปใช้ 1 AI credit"}
                </span>
              )}
            </div>
          </div>
        </details>
      )}

      <article className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{activeDrill.meta.label}</Badge>
            <Badge variant="outline" className="gap-1.5">
              <DrillDifficultyDot difficulty={activeDrill.difficulty} />
              {DRILL_DIFFICULTY_META[activeDrill.difficulty].label}
            </Badge>
            <Badge variant="outline">
              {activeDrill.mode === "constraints" ? "มีข้อจำกัด" : "ฟรีสไตล์"}
            </Badge>
            {activeDrill.template.timeHint && (
              <span className="text-[11px] text-muted-foreground">
                {activeDrill.template.timeHint}
              </span>
            )}
          </div>
          {completedToday && (
            <p className="text-xs text-primary font-medium shrink-0 text-right">
              ทำโจทย์วันนี้เสร็จแล้ว — เก่งมาก!
            </p>
          )}
        </div>

        <p className="text-base sm:text-lg font-semibold leading-snug">{activeDrill.brief}</p>

        {activeDrill.constraints.length > 0 && (
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {activeDrill.constraints.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        )}

        {activeDrill.mode === "free" && activeDrill.template.freeHint && (
          <p className="text-sm text-muted-foreground italic">{activeDrill.template.freeHint}</p>
        )}

        {inProgress && drillMatchesProgress && timerStartedAt != null && (
          <DrillCountdown startedAt={timerStartedAt} totalMinutes={timerTotalMinutes} />
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {!inProgress && !completedToday && (
            <Button onClick={handleStart} className="gap-1.5">
              <Play className="h-3.5 w-3.5" aria-hidden />
              เริ่มทำ
            </Button>
          )}
          {inProgress && drillMatchesProgress && (
            <>
              <Button onClick={handleComplete} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                ทำเสร็จแล้ว
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                ยกเลิก
              </Button>
            </>
          )}
          {((inProgress && drillMatchesProgress) || completedToday) && (
            <Button variant="outline" onClick={handlePost} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              โพส Aplus1
            </Button>
          )}
        </div>

      </article>
    </div>
  );
}
