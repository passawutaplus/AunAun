import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Loader2, Share2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { featureFromRoute } from "@/lib/featureRoute";
import {
  RATING_MOMENT_EVENT,
  finishRating,
  markRatingShown,
  neverAskRating,
  noteActiveDay,
  pendingRatingMoment,
  snoozeRating,
  type RatingMoment,
} from "@/lib/ratingPrompt";
import { useAuth } from "@/hooks/useAuth";
import { pushCloudPrefs } from "@/lib/settingsCloudPrefs";
import { useSubmitFeedback } from "@/hooks/useFeedback";
import MascotMood, { type MascotMoodValue } from "@/components/beta/MascotMood";
import { useFeedbackComposer } from "@/stores/feedbackComposerStore";

const SHOW_DELAY_MS = 4_000;

const LEAD: Record<RatingMoment, string> = {
  first_publish: "ผลงานแรกขึ้นแล้ว",
  plan_agreed: "ตกลงแผนงานกันแล้ว",
  first_hire: "ส่งคำขอจ้างครั้งแรกแล้ว",
  active_days: "ใช้กันมาสักพักแล้ว",
};

const STAR_LABEL = ["", "แย่มาก", "ยังไม่โอเค", "เฉยๆ", "ดีเลย", "ชอบมาก"];

/** Only on calm pages: home and profiles. */
function isPromptRoute(pathname: string) {
  return pathname === "/" || pathname.startsWith("/u/");
}

export default function RatingPrompt() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const composerOpen = useFeedbackComposer((s) => s.phase !== "idle");
  const submit = useSubmitFeedback();

  const [moment, setMoment] = useState<RatingMoment | null>(null);
  const [hover, setHover] = useState(0);
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"rate" | "tell" | "done">("rate");

  useEffect(() => {
    if (user) noteActiveDay();
  }, [user]);

  const check = useCallback(() => {
    if (!user || moment || composerOpen || !isPromptRoute(pathname)) return;
    const next = pendingRatingMoment();
    if (!next) return;
    markRatingShown();
    setMoment(next);
  }, [user, moment, composerOpen, pathname]);

  useEffect(() => {
    const t = window.setTimeout(check, SHOW_DELAY_MS);
    const onMoment = () => window.setTimeout(check, SHOW_DELAY_MS);
    window.addEventListener(RATING_MOMENT_EVENT, onMoment);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(RATING_MOMENT_EVENT, onMoment);
    };
  }, [check]);

  // Leaving home/profile mid-prompt counts as "later"
  useEffect(() => {
    if (moment && step === "rate" && !isPromptRoute(pathname)) {
      snoozeRating();
      reset();
    }
  }, [pathname, moment, step]);

  function reset() {
    setMoment(null);
    setHover(0);
    setStars(0);
    setMessage("");
    setStep("rate");
  }

  if (!moment || composerOpen) return null;

  const later = () => {
    snoozeRating();
    reset();
  };
  const never = () => {
    neverAskRating();
    if (user?.id) void pushCloudPrefs(user.id, { ratingPromptOff: true });
    reset();
  };
  const close = () => {
    if (step === "rate") snoozeRating();
    reset();
  };

  const send = async () => {
    try {
      await submit.mutateAsync({
        feature: featureFromRoute(pathname),
        route: pathname,
        kind: "rating",
        rating: stars,
        message: message.trim().slice(0, 2000),
      });
      finishRating();
      setStep("done");
    } catch {
      // toast from hook
    }
  };

  const invite = async () => {
    const url = window.location.origin;
    const text = "ลองใช้ SAMECOR ดูสิ — ที่รวมผลงานครีเอเตอร์ หาคนร่วมงานได้ง่าย";
    try {
      if (navigator.share) {
        await navigator.share({ title: "SAMECOR", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("คัดลอกลิงก์แล้ว — ส่งต่อให้เพื่อนได้เลย");
    } catch {
      /* user cancelled share */
    }
  };

  const shown = (hover || stars) as MascotMoodValue;
  const happy = stars >= 4;

  return (
    <div
      role="dialog"
      aria-label="ให้คะแนน SAMECOR"
      className="fixed inset-x-3 bottom-24 z-[80] mx-auto max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0 sm:w-[340px]"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <button
          type="button"
          onClick={close}
          aria-label="ปิด"
          className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "done" ? (
          <div className="flex flex-col items-center pb-1 pt-2 text-center">
            <MascotMood mood={happy ? 5 : 4} className="h-16 w-16" />
            <p className="mt-2 font-semibold text-foreground">ขอบคุณ</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {happy ? "ถ้าชอบ ชวนเพื่อนครีเอเตอร์มาลองด้วยกันนะ" : "ทีมจะอ่านทุกข้อ แล้วรีบแก้ให้ดีขึ้น"}
            </p>
            {happy ? (
              <Button size="sm" className="mt-3 rounded-full" onClick={invite}>
                <Share2 className="mr-1.5 h-4 w-4" />
                ชวนเพื่อน
              </Button>
            ) : (
              <Button size="sm" variant="secondary" className="mt-3 rounded-full" onClick={reset}>
                <Check className="mr-1.5 h-4 w-4" />
                เรียบร้อย
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 pr-6">
              <MascotMood mood={shown} className="h-14 w-14 shrink-0 transition-transform duration-200" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#d9731f]">{LEAD[moment]}</p>
                <p className="font-semibold leading-snug text-foreground">ใช้ SAMECOR เป็นยังไงบ้าง?</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const lit = n <= (hover || stars);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} ดาว — ${STAR_LABEL[n]}`}
                    aria-pressed={stars === n}
                    onMouseEnter={() => setHover(n)}
                    onFocus={() => setHover(n)}
                    onBlur={() => setHover(0)}
                    onClick={() => {
                      setStars(n);
                      setStep("tell");
                    }}
                    className="rounded-full p-1 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        lit ? "fill-[#f5a352] text-[#f5a352]" : "fill-transparent text-muted-foreground",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <p className="mt-1 h-4 text-center text-xs text-muted-foreground">{STAR_LABEL[hover || stars]}</p>

            {step === "tell" ? (
              <div className="mt-2 space-y-2">
                <label htmlFor="rating-message" className="text-[13px] font-medium text-foreground">
                  {happy ? "ชอบตรงไหนที่สุด?" : "อยากให้แก้อะไรก่อนเลย?"}
                  <span className="font-normal text-muted-foreground"> (ไม่บังคับ)</span>
                </label>
                <Textarea
                  id="rating-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={happy ? "เช่น หาคนร่วมงานง่ายมาก" : "เช่น หาปุ่มอัปโหลดไม่เจอ"}
                  className="resize-none text-sm"
                />
                <Button className="w-full rounded-full" onClick={send} disabled={submit.isPending}>
                  {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ส่ง"}
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-xs">
                <button type="button" onClick={never} className="text-muted-foreground hover:text-foreground hover:underline">
                  ไม่ต้องถามอีก
                </button>
                <button type="button" onClick={later} className="font-medium text-foreground hover:underline">
                  ไว้ทีหลัง
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
