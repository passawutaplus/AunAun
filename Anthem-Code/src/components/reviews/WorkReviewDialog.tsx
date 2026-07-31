import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, MoreHorizontal, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OverallMoodRating } from "@/components/reviews/OverallMoodRating";
import { StarRating } from "@/components/reviews/StarRating";
import { useSubmitWorkReview } from "@/hooks/useWorkReviews";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/lib/brandConfig";
import {
  averageCategoryScores,
  averagePlatformScores,
  DEFAULT_OVERALL_MOOD,
  emptyCategoryScores,
  emptyPlatformScores,
  PLATFORM_REVIEW_CATEGORIES,
  WORK_REVIEW_CATEGORIES,
  WORK_REVIEW_WIZARD_STEPS,
  type CategoryScores,
  type OverallMoodValue,
  type PlatformReviewCategoryKey,
  type PlatformScores,
  type WorkReviewCategoryKey,
  type WorkReviewKind,
  type WorkReviewWizardStep,
} from "@/lib/workReviews";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Recommend Aplus1 — icon scale (default: recommend). */
type RecommendLevel = "no" | "neutral" | "yes" | "strong";

const RECOMMEND_OPTIONS: {
  id: RecommendLevel;
  label: string;
  /** Legacy 0–10 NPS-compatible score for feedback storage */
  nps: number;
  starRating: number;
  tone: "down" | "neutral" | "up" | "strong";
}[] = [
  { id: "no", label: "ไม่แนะนำ", nps: 0, starRating: 1, tone: "down" },
  { id: "neutral", label: "เฉยๆ", nps: 5, starRating: 3, tone: "neutral" },
  { id: "yes", label: "แนะนำ", nps: 8, starRating: 4, tone: "up" },
  { id: "strong", label: "แนะนำอย่างยิ่ง", nps: 10, starRating: 5, tone: "strong" },
];

const DEFAULT_RECOMMEND: RecommendLevel = "yes";

function RecommendIcon({ tone }: { tone: (typeof RECOMMEND_OPTIONS)[number]["tone"] }) {
  if (tone === "down") return <ThumbsDown className="h-5 w-5" strokeWidth={2.25} aria-hidden />;
  if (tone === "neutral") return <MoreHorizontal className="h-5 w-5" strokeWidth={2.5} aria-hidden />;
  if (tone === "strong") {
    return <ThumbsUp className="h-5 w-5" strokeWidth={2.25} fill="currentColor" aria-hidden />;
  }
  return <ThumbsUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />;
}

export type WorkReviewDialogTarget = {
  kind: WorkReviewKind;
  subjectUserId: string;
  subjectName: string;
  hireRequestId?: string | null;
  collabRequestId?: string | null;
  projectId?: string | null;
  serviceId?: string | null;
  contextLabel?: string | null;
  projectCoverUrl?: string | null;
  subjectAvatarUrl?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: WorkReviewDialogTarget | null;
  onSubmitted?: () => void;
  /** Skip API writes — for /dev/review-form */
  demoMode?: boolean;
  /** Jump to a step when opening (preview) */
  initialStep?: WorkReviewWizardStep;
};

function normalizeStep(step: WorkReviewWizardStep): WorkReviewWizardStep {
  if (step === "intro" || step === "private") return step === "intro" ? "rate" : "system";
  return step;
}

function stepIndex(step: WorkReviewWizardStep): number {
  const n = normalizeStep(step);
  if (n === "done") return WORK_REVIEW_WIZARD_STEPS.length;
  return WORK_REVIEW_WIZARD_STEPS.findIndex((s) => s.id === n);
}

function WizardStepper({ step }: { step: WorkReviewWizardStep }) {
  if (step === "done") return null;
  const current = stepIndex(step);

  return (
    <ol className="mt-4 flex items-start justify-between gap-2 px-2">
      {WORK_REVIEW_WIZARD_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="relative flex flex-1 flex-col items-center text-center">
            {i < WORK_REVIEW_WIZARD_STEPS.length - 1 ? (
              <span
                className={cn(
                  "absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-3.5 h-0.5",
                  done || active ? "bg-primary/50" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                done || active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "mt-1.5 text-[11px] leading-tight",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
              {s.privateLabel ? (
                <span className="mt-0.5 block text-[9px] font-normal text-muted-foreground/80">
                  (ไม่เปิดเผย)
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkReviewDialog({
  open,
  onOpenChange,
  target,
  onSubmitted,
  demoMode = false,
  initialStep = "rate",
}: Props) {
  const submitReview = useSubmitWorkReview();
  const [step, setStep] = useState<WorkReviewWizardStep>(normalizeStep(initialStep));
  const [scores, setScores] = useState<CategoryScores>(emptyCategoryScores);
  const [overallMood, setOverallMood] = useState<OverallMoodValue>(DEFAULT_OVERALL_MOOD);
  const [body, setBody] = useState("");
  const [platformScores, setPlatformScores] = useState<PlatformScores>(emptyPlatformScores);
  const [recommend, setRecommend] = useState<RecommendLevel>(DEFAULT_RECOMMEND);
  const [systemNote, setSystemNote] = useState("");
  const [busy, setBusy] = useState(false);

  const overall = useMemo(() => averageCategoryScores(scores), [scores]);
  const allScored = overall != null;
  const platformOverall = useMemo(() => averagePlatformScores(platformScores), [platformScores]);
  const platformAllScored = platformOverall != null;
  const peerLabel = target?.kind === "collab" ? "คู่คอลแลป" : "ครีเอเตอร์";

  const subjectQ = useQuery({
    queryKey: ["work-review-subject", target?.subjectUserId],
    enabled: open && !!target?.subjectUserId && !target?.subjectAvatarUrl,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", target!.subjectUserId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      } | null;
    },
  });

  const subjectName =
    target?.subjectName?.trim() ||
    subjectQ.data?.display_name?.trim() ||
    subjectQ.data?.username?.trim() ||
    peerLabel;
  const subjectAvatar =
    target?.subjectAvatarUrl?.trim() || subjectQ.data?.avatar_url?.trim() || null;

  useEffect(() => {
    if (!open) return;
    setStep(normalizeStep(initialStep));
    setScores(emptyCategoryScores());
    setOverallMood(DEFAULT_OVERALL_MOOD);
    setBody("");
    setPlatformScores(emptyPlatformScores());
    setRecommend(DEFAULT_RECOMMEND);
    setSystemNote("");
    setBusy(false);
  }, [open, initialStep, target?.hireRequestId, target?.collabRequestId]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const setCategory = (key: WorkReviewCategoryKey, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const setPlatformCategory = (key: PlatformReviewCategoryKey, value: number) => {
    setPlatformScores((prev) => ({ ...prev, [key]: value }));
  };

  const finishAll = async () => {
    if (!target || overall == null || platformOverall == null) return;
    const recommendOpt = RECOMMEND_OPTIONS.find((o) => o.id === recommend) ?? RECOMMEND_OPTIONS[2];

    if (demoMode) {
      setStep("done");
      return;
    }

    setBusy(true);
    try {
      await submitReview.mutateAsync({
        kind: target.kind,
        subjectUserId: target.subjectUserId,
        hireRequestId: target.hireRequestId,
        collabRequestId: target.collabRequestId,
        rating: overallMood,
        categories: scores,
        tags: [],
        body: body.trim() || null,
        projectId: target.projectId,
        serviceId: target.serviceId,
      });

      const route = target.kind === "hire" ? "/dashboard" : "/dashboard/collab";
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const vp = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";
      const platformMsg = PLATFORM_REVIEW_CATEGORIES.map(
        (c) => `${c.key}:${platformScores[c.key]}`,
      ).join(",");
      try {
        await (supabase.rpc as (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>)(
          "submit_feedback",
          {
            _feature: `work_review_platform_${target.kind}`,
            _route: route,
            _rating: Math.max(1, Math.min(5, Math.round(platformOverall))),
            _message: `platform:${platformMsg}`,
            _project_id: target.projectId ?? null,
            _user_agent: ua,
            _viewport: vp,
          },
        );
      } catch {
        /* ignore */
      }
      try {
        await (supabase.rpc as (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>)(
          "submit_feedback",
          {
            _feature: `work_review_nps_${target.kind}`,
            _route: route,
            _rating: recommendOpt.starRating,
            _message: `nps:${recommendOpt.nps}|level:${recommendOpt.id}${systemNote.trim() ? ` | ${systemNote.trim().slice(0, 400)}` : ""}`,
            _project_id: target.projectId ?? null,
            _user_agent: ua,
            _viewport: vp,
          },
        );
      } catch {
        /* ignore */
      }

      setStep("done");
      onSubmitted?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "ส่งรีวิวไม่สำเร็จ";
      toast.error(msg.includes("duplicate") || msg.includes("unique") ? "คุณรีวิวงานนี้ไปแล้ว" : msg);
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === "done"
      ? "รีวิวสำเร็จ"
      : `ให้คะแนน${peerLabel}หลังจบงาน`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(94vh,760px)] max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <div className="border-b border-border/50 px-5 pb-3 pt-5 sm:px-6">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="flex items-start gap-2.5 thai-display text-lg leading-snug sm:text-xl">
              {step !== "done" ? (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Star className="h-4 w-4 fill-primary" aria-hidden />
                </span>
              ) : null}
              <span>{title}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {step === "done"
                ? "รีวิวถูกบันทึกแล้ว"
                : "ให้คะแนนและส่งความคิดเห็นหลังจบงาน"}
            </DialogDescription>
          </DialogHeader>
          <WizardStepper step={step} />
        </div>

        <div className="max-h-[min(62vh,520px)] overflow-y-auto px-5 py-4 sm:px-6">
          {step === "rate" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-border/50">
                  {subjectAvatar ? (
                    <img
                      src={subjectAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-semibold text-muted-foreground">
                      {subjectName.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {target?.kind === "collab" ? "คู่คอลแลป" : "ครีเอเตอร์"} · รีวิวหลังจบงาน
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">ให้คะแนนแต่ละด้าน</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                    allScored ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Star className={cn("h-3 w-3", allScored && "fill-primary")} aria-hidden />
                  {allScored ? (
                    <>
                      เฉลี่ย <span className="font-semibold">{overall!.toFixed(1)}</span>
                    </>
                  ) : (
                    "ครบ 5 ด้าน"
                  )}
                </span>
              </div>
              <ul className="space-y-2">
                {WORK_REVIEW_CATEGORIES.map((cat) => (
                  <li
                    key={cat.key}
                    className="flex flex-col gap-2 rounded-xl border border-border/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.hint}</p>
                    </div>
                    <StarRating
                      value={scores[cat.key]}
                      onChange={(n) => setCategory(cat.key, n)}
                      size="md"
                      aria-label={`${cat.label} — ให้คะแนน 1 ถึง 5 ดาว`}
                    />
                  </li>
                ))}
              </ul>

              <div className="border-t border-border/70 pt-5">
                <OverallMoodRating
                  value={overallMood}
                  onChange={setOverallMood}
                  title={
                    target?.kind === "collab"
                      ? "ภาพรวมคอลแลปครั้งนี้"
                      : "ภาพรวมการจ้างครั้งนี้"
                  }
                />
              </div>

              <div className="space-y-2 border-t border-border/70 pt-5">
                <label htmlFor="work-review-body" className="text-sm font-medium text-foreground">
                  ความคิดเห็นที่ต้องการแชร์ (ไม่บังคับ)
                </label>
                <Textarea
                  id="work-review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 500))}
                  placeholder="เล่าสั้นๆ ว่าทำงานด้วยกันเป็นยังไง…"
                  className="min-h-[96px] resize-none rounded-xl"
                  maxLength={500}
                />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    คะแนนและความคิดเห็นของคุณจะถูกแสดงบนโปรไฟล์ของอีกฝ่าย
                  </p>
                  <p className="shrink-0 text-[10px] text-muted-foreground">{body.length}/500</p>
                </div>
              </div>
            </div>
          ) : null}

          {step === "system" ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">ให้คะแนนประสบการณ์บนแพลตฟอร์ม</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                      platformAllScored
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Star className={cn("h-3 w-3", platformAllScored && "fill-primary")} aria-hidden />
                    {platformAllScored ? (
                      <>
                        เฉลี่ย <span className="font-semibold">{platformOverall!.toFixed(1)}</span>
                      </>
                    ) : (
                      "ครบ 5 ด้าน"
                    )}
                  </span>
                </div>
                <ul className="space-y-2">
                  {PLATFORM_REVIEW_CATEGORIES.map((cat) => (
                    <li
                      key={cat.key}
                      className="flex flex-col gap-2 rounded-xl border border-border/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.hint}</p>
                      </div>
                      <StarRating
                        value={platformScores[cat.key]}
                        onChange={(n) => setPlatformCategory(cat.key, n)}
                        size="md"
                        aria-label={`${cat.label} — ให้คะแนน 1 ถึง 5 ดาว`}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-border/70 pt-5">
                <p className="text-sm font-semibold text-foreground">
                  คุณอยากแนะนำ {BRAND_NAME} ให้คนรู้จักใช้หรือไม่?
                </p>
                <div
                  className="mt-4 grid grid-cols-4 gap-2 sm:gap-3"
                  role="radiogroup"
                  aria-label={`ระดับการแนะนำ ${BRAND_NAME}`}
                >
                  {RECOMMEND_OPTIONS.map((opt) => {
                    const on = recommend === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={opt.label}
                        onClick={() => setRecommend(opt.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl px-1 py-2 transition-colors",
                          on ? "bg-primary/10" : "hover:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition-transform",
                            on && "scale-105 ring-2 ring-offset-2 ring-offset-background",
                            opt.tone === "down" && "bg-zinc-700 dark:bg-zinc-600",
                            opt.tone === "neutral" && "bg-zinc-500",
                            opt.tone === "up" && "bg-orange-500",
                            opt.tone === "strong" && "bg-orange-600",
                            on && opt.tone === "up" && "ring-orange-500",
                            on && opt.tone === "strong" && "ring-orange-600",
                            on && opt.tone === "neutral" && "ring-zinc-500",
                            on && opt.tone === "down" && "ring-zinc-700",
                          )}
                        >
                          <RecommendIcon tone={opt.tone} />
                        </span>
                        <span
                          className={cn(
                            "text-center text-[11px] font-medium leading-tight sm:text-xs",
                            on ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 border-t border-border/70 pt-5">
                <label htmlFor="work-review-system-note" className="text-sm font-medium text-foreground">
                  บอกความประทับใจ/ไม่ประทับใจที่มีต่อระบบ (ไม่บังคับ)
                </label>
                <Textarea
                  id="work-review-system-note"
                  value={systemNote}
                  onChange={(e) => setSystemNote(e.target.value.slice(0, 500))}
                  placeholder="ช่วยให้เราพัฒนาระบบได้ตรงจุดขึ้น…"
                  className="min-h-[88px] resize-none rounded-xl"
                  maxLength={500}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  ความเห็นในหน้านี้จะไม่ถูกเปิดเผยต่ออีกฝ่าย และจะนำไปพัฒนาคุณภาพของ {BRAND_NAME}
                </p>
              </div>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="flex flex-col items-center px-2 py-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden />
              </span>
              <p className="mt-4 text-lg font-semibold text-foreground">รีวิวสำเร็จ</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                ขอบคุณสำหรับการให้คะแนนและความคิดเห็น ทีมงานจะนำความเห็นไปพัฒนาการให้บริการให้ดียิ่งขึ้น
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-border/50 bg-muted/20 px-5 py-4 sm:px-6">
          {step === "rate" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full"
                onClick={() => handleOpenChange(false)}
              >
                ไว้ทีหลัง
              </Button>
              <Button
                type="button"
                className="h-11 flex-[1.4] rounded-full bg-gradient-brand text-white hover:opacity-90"
                disabled={!allScored}
                onClick={() => setStep("system")}
              >
                ถัดไป
              </Button>
            </>
          ) : null}

          {step === "system" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full"
                onClick={() => setStep("rate")}
                disabled={busy}
              >
                ย้อนกลับ
              </Button>
              <Button
                type="button"
                className="h-11 flex-[1.4] rounded-full bg-gradient-brand text-white hover:opacity-90"
                disabled={!platformAllScored || busy}
                onClick={() => void finishAll()}
              >
                {busy ? "กำลังส่ง…" : "ส่งข้อมูล"}
              </Button>
            </>
          ) : null}

          {step === "done" ? (
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-gradient-brand text-white hover:opacity-90"
              onClick={() => handleOpenChange(false)}
            >
              เสร็จสิ้น
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { WorkReviewWizardStep };
