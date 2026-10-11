import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourMascot } from "@/components/project/TourMascot";
import { ModulesScene, SCENES_CSS, TemplatesScene } from "@/components/project/EditorInfoScenes";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "samecor.uploadTour.v1";
export const TOUR_DIALOG_SLOT_ID = "editor-tour-dialog-slot";

export function hasSeenEditorTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function markEditorTourSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* private mode — the tour may show again, which is harmless */
  }
}

export type TourFacts = {
  hasImage: boolean;
  title: string;
  categorySet: boolean;
  shortDescription: string;
  detailsOpen: boolean;
};

type StepId =
  | "welcome"
  | "drop"
  | "title"
  | "addbar"
  | "library"
  | "preview"
  | "details"
  | "category"
  | "shortdesc"
  | "final";

type Step = {
  id: StepId;
  title: string;
  body: string;
  target?: string;
  /** Inside the details dialog: the card is portalled there instead of floating over the page. */
  inDialog?: boolean;
  /** No "next" button — the step finishes by itself once the user does the thing. */
  waitsForAction?: boolean;
  actionHint?: string;
  next?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: "มาลงผลงานชิ้นแรกกัน! ใช้เวลาประมาณ 2 นาที เราจะพาไปทีละขั้น จนเกือบถึงปุ่มเผยแพร่",
    next: "เริ่มเลย",
  },
  {
    id: "drop",
    title: "Drop a photo",
    body: "ลากรูปมาวางตรงนี้ หรือคลิกเพื่อเลือกรูปจากเครื่อง รูปแรกจะเป็นภาพปกให้อัตโนมัติ",
    target: "drop",
    waitsForAction: true,
    actionHint: "ใส่รูปอย่างน้อย 1 รูปก่อน แล้วไปขั้นต่อไปให้เอง",
  },
  {
    id: "addbar",
    title: "Add more",
    body: "กดปุ่มด้านล่างเพื่อเพิ่มรูป ข้อความ วิดีโอ หรือแกลเลอรี บางปุ่มมีหลายแบบให้เลือก",
    target: "addbar",
    next: "ถัดไป",
  },
  {
    id: "library",
    title: "Module & Template",
    body: "อยู่แถบซ้าย กด ⓘ ข้างชื่อแต่ละแบบเพื่อดูภาพเคลื่อนไหวอธิบายเพิ่ม",
    target: "library",
    next: "ถัดไป",
  },
  {
    id: "preview",
    title: "Preview",
    body: "กดรูปตาเพื่อดูว่าคนอื่นจะเห็นหน้าผลงานแบบไหน",
    target: "preview",
    next: "ถัดไป",
  },
  {
    id: "details",
    title: "Work details",
    body: "กดปุ่มนี้เพื่อเลือกหมวดและเขียนรายละเอียดสั้น ๆ ที่ต้องมีก่อนเผยแพร่",
    target: "details",
    waitsForAction: true,
    actionHint: "กดปุ่มที่ไฮไลต์ไว้",
  },
  {
    id: "title",
    title: "Name your work",
    body: "พิมพ์ชื่องานตรงนี้ สั้น ๆ ก็พอ",
    target: "title",
    inDialog: true,
    waitsForAction: true,
    actionHint: "พิมพ์เสร็จจะไปขั้นต่อไปให้เอง",
  },
  {
    id: "category",
    title: "Category",
    body: "เลือกหมวดใหญ่และหมวดย่อยที่ตรงกับงาน",
    target: "category",
    inDialog: true,
    waitsForAction: true,
    actionHint: "เลือกแล้วไปขั้นต่อไปให้เอง",
  },
  {
    id: "shortdesc",
    title: "Short description",
    body: "สรุปว่างานนี้คืออะไร ทำอะไร หรือจุดเด่นที่อยากให้จำ",
    target: "shortdesc",
    inDialog: true,
    waitsForAction: true,
    actionHint: "พิมพ์เสร็จจะไปขั้นต่อไปให้เอง",
  },
  {
    id: "final",
    title: "Almost there",
    body: "ช่องอื่นไว้ทีหลังได้ ถ้าพร้อมกด “เผยแพร่” ได้เลย หรือบันทึกฉบับร่างไว้ก่อนก็ได้",
    target: "publish-dialog",
    inDialog: true,
    next: "จบทัวร์",
  },
];

/** The first-run guide is shorter on phones: no left rail, no preview button. */
function stepsForViewport(): Step[] {
  const wide = typeof window === "undefined" || window.innerWidth >= 1024;
  return wide ? STEPS : STEPS.filter((s) => s.id !== "library" && s.id !== "preview");
}

export function findTarget(name: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return nodes.find((el) => el.getBoundingClientRect().width > 0) ?? null;
}

type Props = {
  open: boolean;
  facts: TourFacts;
  onClose: () => void;
  onOpenDetails: () => void;
};

/**
 * Guided first upload: spotlights one control at a time and moves on by itself when the user does the thing
 * (drop an image, name it, pick a category…), stopping just before "publish".
 */
export function EditorTour({ open, facts, onClose, onOpenDetails }: Props) {
  const steps = useMemo(() => (open ? stepsForViewport() : []), [open]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const idleRef = useRef<number | null>(null);
  const step = steps[index];

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const close = useCallback(() => {
    markEditorTourSeen();
    onClose();
  }, [onClose]);

  const advance = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= steps.length) {
        window.setTimeout(close, 0);
        return i;
      }
      return i + 1;
    });
  }, [steps.length, close]);

  // Steps whose job is already done (an image is already there, the dialog is already open…) are skipped.
  useEffect(() => {
    if (!open || !step) return;
    if (step.id === "drop" && facts.hasImage) advance();
    if (step.id === "details" && facts.detailsOpen) advance();
    if (step.id === "category" && facts.categorySet) advance();
  }, [open, step, facts.hasImage, facts.detailsOpen, facts.categorySet, advance]);

  // If the dialog gets closed in the middle of the dialog steps, step back to "open it".
  useEffect(() => {
    if (!open || !step?.inDialog || facts.detailsOpen) return;
    const back = steps.findIndex((s) => s.id === "details");
    if (back >= 0) setIndex(back);
  }, [open, step, facts.detailsOpen, steps]);

  // Typing steps wait for a short pause so the card does not jump while the user is mid-word.
  useEffect(() => {
    if (!open || !step) return;
    if (idleRef.current) window.clearTimeout(idleRef.current);
    const typed =
      (step.id === "title" && facts.title.trim().length >= 2) ||
      (step.id === "shortdesc" && facts.shortDescription.trim().length >= 4);
    if (typed) idleRef.current = window.setTimeout(advance, 1400);
    return () => {
      if (idleRef.current) window.clearTimeout(idleRef.current);
    };
  }, [open, step, facts.title, facts.shortDescription, advance]);

  // Follow the target as the page scrolls, resizes or re-renders.
  useEffect(() => {
    if (!open || !step?.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = findTarget(step.target as string);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const first = findTarget(step.target);
    first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  // Glow on the real element (works inside the dialog too).
  useEffect(() => {
    if (!open || !step?.target) return;
    const el = findTarget(step.target);
    el?.setAttribute("data-tour-active", "true");
    return () => el?.removeAttribute("data-tour-active");
  }, [open, step, rect]);

  if (!open || !step) return null;

  const progress = `${index + 1}/${steps.length}`;
  const card = (
    <div
      role="dialog"
      aria-label="ทัวร์แนะนำการลงผลงาน"
      className={cn(
        "rounded-2xl border border-border bg-card p-4 text-left",
        step.id === "welcome" ? "w-[320px]" : step.id === "library" ? "w-[400px]" : "w-[280px]",
        step.inDialog ? "mb-4 w-full" : "pointer-events-auto fixed z-[70]",
      )}
      style={step.inDialog ? undefined : cardPosition(rect, step.id)}
    >
      {step.id === "welcome" ? <TourMascot /> : null}
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-display text-base font-normal tracking-tight text-foreground">{step.title}</p>
        <button
          type="button"
          onClick={close}
          aria-label="ปิดทัวร์"
          className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
      {step.id === "library" ? <LibraryScenes /> : null}
      {step.actionHint ? <p className="mt-2 text-[11px] text-muted-foreground/80">{step.actionHint}</p> : null}
      <div className="mt-3 flex items-center gap-2">
        <span className="mr-auto text-[11px] text-muted-foreground">{progress}</span>
        {step.id === "details" ? (
          <Button type="button" size="sm" className="rounded-full" onClick={onOpenDetails}>
            เปิดให้ดู
          </Button>
        ) : step.next ? (
          <Button
            type="button"
            size="sm"
            variant={step.waitsForAction ? "ghost" : "default"}
            className="rounded-full"
            onClick={advance}
          >
            {step.next}
          </Button>
        ) : null}
      </div>
    </div>
  );

  const slot = step.inDialog ? document.getElementById(TOUR_DIALOG_SLOT_ID) : null;
  const dim = !step.inDialog ? <Spotlight rect={rect} /> : null;
  return (
    <>
      {dim}
      {step.inDialog ? (slot ? createPortal(card, slot) : null) : createPortal(card, document.body)}
    </>
  );
}

/** Module (top) and Template (bottom) motion graphics, scaled down to sit inside the tour card. */
function LibraryScenes() {
  const scaled = (children: React.ReactNode) => (
    <div className="overflow-hidden rounded-xl" style={{ height: 150 }}>
      <div style={{ transform: "scale(.6)", transformOrigin: "top left", width: "166.6%" }}>{children}</div>
    </div>
  );
  return (
    <div className="mt-3 space-y-3">
      <style>{SCENES_CSS}</style>
      <div>
        <p className="mb-1 font-display text-xs text-foreground">Module</p>
        {scaled(<ModulesScene />)}
        <p className="mt-1 text-[11px] text-muted-foreground">ลากชิ้นส่วนไปวางบนผลงาน หรือกดเพื่อต่อท้าย</p>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1 font-display text-xs text-foreground">Template</p>
        {scaled(<TemplatesScene />)}
        <p className="mt-1 text-[11px] text-muted-foreground">เลือกโครงสำเร็จรูป แล้วใส่รูปของคุณแทนช่องตัวอย่าง</p>
      </div>
    </div>
  );
}

function cardPosition(rect: DOMRect | null, stepId?: string): React.CSSProperties {
  const W = 280;
  const H = 190;
  if (!rect) {
    return { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (stepId === "library") {
    // Beside the sidebar, never on top of it.
    return { left: Math.min(rect.right + 16, vw - 412), top: Math.max(12, rect.top + 8) };
  }
  let left = rect.left + rect.width / 2 - W / 2;
  let top = rect.bottom + 16;
  if (rect.width < 120 && rect.left < 140) {
    // narrow left rail → card to its right
    left = rect.right + 16;
    top = rect.top + 8;
  } else if (top + H > vh) {
    top = Math.max(12, rect.top - H - 16);
  }
  left = Math.min(Math.max(12, left), vw - W - 12);
  top = Math.min(Math.max(12, top), vh - H - 12);
  return { left, top };
}

/** Dim everything except the target; clicks still pass through to the real page. */
export function Spotlight({ rect }: { rect: DOMRect | null }) {
  const pad = 8;
  const vw = typeof window === "undefined" ? 0 : window.innerWidth;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  let clip = "none";
  if (rect) {
    const x0 = Math.max(0, rect.left - pad);
    const y0 = Math.max(0, rect.top - pad);
    const x1 = Math.min(vw, rect.right + pad);
    const y1 = Math.min(vh, rect.bottom + pad);
    clip = `polygon(0 0, ${vw}px 0, ${vw}px ${vh}px, 0 ${vh}px, 0 0, ${x0}px ${y0}px, ${x0}px ${y1}px, ${x1}px ${y1}px, ${x1}px ${y0}px, ${x0}px ${y0}px)`;
  }
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[65] bg-black/50 transition-[clip-path] duration-300"
      style={{ clipPath: clip }}
    />,
    document.body,
  );
}
