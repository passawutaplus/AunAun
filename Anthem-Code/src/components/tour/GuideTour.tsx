import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourMascot } from "@/components/project/TourMascot";
import { Spotlight, findTarget } from "@/components/project/EditorTour";
import { useAuth } from "@/hooks/useAuth";
import { markTourDone, turnTourOff, type GuideTourId } from "@/lib/guideTours";
import { cn } from "@/lib/utils";

export type GuideTourStep = {
  id: string;
  /** Short English label (Agrandir); the explanation goes in `body` (Thai). */
  title: string;
  body: string;
  /** `data-tour` value of the element to spotlight; none = centred card. */
  target?: string;
  /** Skipped when the target is not on screen (desktop-only rails, features that are off…). */
  optional?: boolean;
  /** Small looping motion that shows what the text means — only where words alone are hard to follow. */
  scene?: ReactNode;
  /** Runs when the step becomes active (switch a tab, open a panel…). */
  onEnter?: () => void;
};

type Props = {
  tourId: GuideTourId;
  /** Accessible name, e.g. "ทัวร์แนะนำหน้าแรก". */
  label: string;
  steps: GuideTourStep[];
  open: boolean;
  onClose: () => void;
};

/** Phones: room kept clear for the sticky top bar and the floating bottom nav. */
const PHONE_TOP = 72;
const PHONE_BOTTOM = 104;

function placeCard(rect: DOMRect | null, wide: boolean, cardH: number): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) {
    // Phones: centred when nothing is highlighted. Otherwise the highlight is scrolled near the top (see the
    // scroll effect) and the card sits right under it; if that does not fit, above it; last resort, above the nav.
    const side = { left: 16, right: 16 };
    if (!rect) return { ...side, top: "50%", transform: "translateY(-50%)" };
    const below = rect.bottom + 16;
    if (below + cardH <= vh - PHONE_BOTTOM) return { ...side, top: below };
    const above = rect.top - 16 - cardH;
    if (above >= PHONE_TOP - 56) return { ...side, top: above };
    return { ...side, bottom: PHONE_BOTTOM };
  }
  const W = wide ? 360 : 320;
  const H = wide ? 330 : 210;
  if (!rect) return { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  let left = rect.left + rect.width / 2 - W / 2;
  let top = rect.bottom + 16;
  if (rect.width < 120 && rect.left < 280) {
    // Narrow left rail → card to its right
    left = rect.right + 16;
    top = rect.top;
  } else if (top + H > vh) {
    top = Math.max(12, rect.top - H - 16);
  }
  if (rect.height > vh * 0.6) top = vh - H - 24;
  left = Math.min(Math.max(12, left), vw - W - 12);
  top = Math.min(Math.max(12, top), vh - H - 12);
  return { left, top };
}

/**
 * Look-only page walkthrough: spotlight + card, next / back / keyboard, steps whose target is missing are skipped.
 * Finishing marks the tour done; ✕ / Esc closes for this visit; "ไม่ต้องแสดงอีก" switches it off.
 */
export function GuideTour({ tourId, label, steps: allSteps, open, onClose }: Props) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(
    () => (open ? allSteps.filter((s) => !s.optional || !s.target || findTarget(s.target)) : []),
    // Re-evaluated each time the tour opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (open) step?.onEnter?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id]);

  const close = useCallback(() => onClose(), [onClose]);
  const finish = useCallback(() => {
    void markTourDone(user?.id, tourId);
    onClose();
  }, [onClose, tourId, user?.id]);
  const neverAgain = useCallback(() => {
    void turnTourOff(user?.id, tourId);
    onClose();
  }, [onClose, tourId, user?.id]);

  const next = useCallback(() => (last ? finish() : setIndex((i) => i + 1)), [last, finish]);
  const back = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next]);

  // Follow the target through scroll, resize and re-render.
  useEffect(() => {
    if (!open || !step?.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = findTarget(step.target as string);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      // Phones: a target taller than half the screen (e.g. the whole feed) is spotlit only at its top,
      // so the card can sit below it instead of covering what it describes.
      const cap = window.innerHeight * 0.3;
      setRect(window.innerWidth < 640 && r.height > window.innerHeight * 0.5 ? new DOMRect(r.x, r.y, r.width, cap) : r);
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = findTarget(step.target);
    if (el && window.innerWidth < 640) {
      // Phones: bring the highlight up under the top bar so the card has room below it.
      const top = el.getBoundingClientRect().top;
      window.scrollBy({ top: top - PHONE_TOP, behavior: reduced ? "auto" : "smooth" });
    } else {
      el?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open || !step?.target) return;
    const el = findTarget(step.target);
    el?.setAttribute("data-tour-active", "true");
    return () => el?.removeAttribute("data-tour-active");
  }, [open, step, rect]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, index]);

  // Real card height, so the phone layout can keep it off the highlight.
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 4) setCardH(h);
  });

  if (!open || !step) return null;

  const wide = !!step.scene;
  return (
    <>
      <Spotlight rect={rect} />
      {createPortal(
        <div
          ref={cardRef}
          tabIndex={-1}
          role="dialog"
          aria-label={label}
          className={cn(
            "pointer-events-auto fixed z-[70] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-4 text-left shadow-sm outline-none max-sm:w-auto",
            wide ? "w-[360px]" : "w-[320px]",
          )}
          style={placeCard(rect, wide, cardH)}
        >
          {index === 0 ? <TourMascot /> : null}
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="font-display text-base font-light tracking-tight text-foreground">{step.title}</p>
            <button
              type="button"
              onClick={close}
              aria-label="ปิดทัวร์"
              className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
          {step.scene ? <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">{step.scene}</div> : null}
          <div className="mt-3 flex items-center gap-2">
            <span className="mr-auto flex items-center gap-1" aria-label={`ขั้นที่ ${index + 1} จาก ${steps.length}`}>
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === index ? "w-4 bg-brand" : i < index ? "w-1.5 bg-foreground/40" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </span>
            {index > 0 ? (
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={back}>
                <ChevronLeft className="mr-0.5 h-3.5 w-3.5" aria-hidden /> ย้อนกลับ
              </Button>
            ) : null}
            <Button type="button" size="sm" className="rounded-full" onClick={next}>
              {index === 0 ? "เริ่มเลย" : last ? "จบทัวร์" : "ถัดไป"}
            </Button>
          </div>
          {!last ? (
            <button
              type="button"
              onClick={neverAgain}
              className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              ไม่ต้องแสดงอีก
            </button>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ในหน้านี้ หรือในตั้งค่า</p>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
