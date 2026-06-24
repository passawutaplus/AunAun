import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Target,
  Shuffle,
  CheckCircle2,
  Play,
  Flame,
  Lock,
  Sparkles,
  ChevronDown,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  DRILL_CATEGORY_META,
  DRILL_DIFFICULTY_META,
  type DrillCategory,
  type DrillDifficulty,
  type DrillMode,
} from "@/data/designDrillPrompts.vendored";
import {
  buildDrillDescription,
  buildDrillTags,
  pickDailyDrill,
  pickDrill,
  type PickedDrill,
} from "@/lib/designDrillPick.vendored";
import {
  clearDrillInProgress,
  getDrillInProgress,
  getDrillStreak,
  isDrillCompletedToday,
  markDrillCompleted,
  markDrillStarted,
} from "@/lib/designDrillStorage";
import { parseTimeHintToMinutes } from "@/lib/parseTimeHint.vendored";
import { todayISO } from "@/lib/dailySeedPick.vendored";
import { fetchDrillRerollStatus, requestDrillReroll, saltToRollSeed } from "@/lib/drillReroll";
import { projectsDrillFeedUrl } from "@/lib/drillProject";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrillDifficultyDot } from "./DrillDifficultyDot";
import { DrillCountdown } from "./DrillCountdown";

type Tab = "daily" | "custom";

const CATEGORIES = Object.keys(DRILL_CATEGORY_META) as DrillCategory[];
const DIFFICULTIES = Object.keys(DRILL_DIFFICULTY_META) as DrillDifficulty[];

function buildPostSearchParams(drill: PickedDrill, tab: Tab): string {
  const tags = buildDrillTags(drill, { daily: tab === "daily" });
  const params = new URLSearchParams({
    from: "so1o",
    title: drill.brief.slice(0, 120),
    description: buildDrillDescription(drill).slice(0, 4000),
    category: drill.meta.anthemCategory,
    tags: tags.join(","),
    drill_type: tab,
  });
  if (tab === "daily") params.set("drill_date", todayISO());
  return params.toString();
}

export function DesignDrillSection() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("daily");
  const [category, setCategory] = useState<DrillCategory>("logo");
  const [difficulty, setDifficulty] = useState<DrillDifficulty>("medium");
  const [mode, setMode] = useState<DrillMode>("constraints");
  const [rollSeed, setRollSeed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [progressTick, setProgressTick] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [savedBrief, setSavedBrief] = useState<string | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerTotalMinutes, setTimerTotalMinutes] = useState(90);
  const [rerollRemaining, setRerollRemaining] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const refreshRerollStatus = useCallback(async () => {
    try {
      const s = await fetchDrillRerollStatus();
      setRerollRemaining(s.remaining);
    } catch {
      setRerollRemaining(null);
    }
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    if (tab === "custom") refreshRerollStatus();
  }, [tab, refreshRerollStatus]);

  const dailyDrill = useMemo(() => pickDailyDrill(), []);
  const customDrill = useMemo(
    () => pickDrill({ category, difficulty, mode, salt: String(rollSeed) }),
    [category, difficulty, mode, rollSeed],
  );

  const activeDrill: PickedDrill = tab === "daily" ? dailyDrill : customDrill;
  const drillMatchesProgress = !inProgress || savedBrief === activeDrill.brief;

  useEffect(() => {
    if (!inProgress || savedBrief === activeDrill.brief) return;
    clearDrillInProgress();
    setInProgress(false);
    setSavedBrief(null);
  }, [tab, category, difficulty, mode, rollSeed, activeDrill.brief, inProgress, savedBrief]);

  const handleRoll = async () => {
    setRolling(true);
    try {
      const result = await requestDrillReroll();
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
  };

  const handleComplete = () => {
    markDrillCompleted();
    setInProgress(false);
    setCompletedToday(true);
    setTimerStartedAt(null);
    setStreak(getDrillStreak());
    setProgressTick((t) => t + 1);
  };

  const handlePost = () => {
    navigate(`/portfolio/new?${buildPostSearchParams(activeDrill, tab)}`);
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
          <span className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
            <Target className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">โจทย์เดียวกับ So1o ทุกวัน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Flame className="h-3 w-3" aria-hidden />
              {streak} วันติด
            </Badge>
          )}
          <Button variant="outline" size="sm" asChild className="gap-1.5 rounded-full">
            <Link to={projectsDrillFeedUrl()}>
              <Users className="h-3.5 w-3.5" aria-hidden />
              ดูผลงานวันนี้
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["daily", "custom"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {t === "daily" ? "โจทย์ประจำวัน" : "สุ่มเอง"}
          </button>
        ))}
      </div>

      {tab === "custom" && (
        <details className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
            <span>ตั้งค่าโจทย์</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-3 space-y-3 pt-3 border-t border-border/60">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  {DRILL_CATEGORY_META[c].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                    difficulty === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <DrillDifficultyDot difficulty={d} />
                    {DRILL_DIFFICULTY_META[d].label}
                  </span>
                </button>
              ))}
              {(["constraints", "free"] as DrillMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                    mode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {m === "constraints" ? (
                      <Lock className="h-3 w-3" aria-hidden />
                    ) : (
                      <Sparkles className="h-3 w-3" aria-hidden />
                    )}
                    {m === "constraints" ? "มีข้อจำกัด" : "ฟรีสไตล์"}
                  </span>
                </button>
              ))}
            </div>
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
              <span className="text-[11px] text-muted-foreground">{activeDrill.template.timeHint}</span>
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

        {inProgress && drillMatchesProgress && timerStartedAt != null && (
          <DrillCountdown startedAt={timerStartedAt} totalMinutes={timerTotalMinutes} />
        )}

        <div className="flex flex-wrap gap-2 pt-1">
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

      </article>
    </div>
  );
}
