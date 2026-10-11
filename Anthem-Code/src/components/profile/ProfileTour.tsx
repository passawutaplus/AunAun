import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourMascot } from "@/components/project/TourMascot";
import { Spotlight, findTarget } from "@/components/project/EditorTour";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "samecor.profileTour.v1";

export function hasSeenProfileTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function markProfileTourSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* private mode — the tour may show again, which is harmless */
  }
}

type Step = {
  id: string;
  title: string;
  body: string;
  /** `data-tour` value of the element to spotlight; none = centred card. */
  target?: string;
  /** Skipped when the target is not on screen (e.g. the desktop-only action row on a phone). */
  optional?: boolean;
  /** Profile tab to show behind the card while this step is on. */
  tab?: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: "พาชมหน้าโปรไฟล์ของคุณสั้น ๆ — ดูอย่างเดียว ไม่ต้องกดอะไรจริง ย้อนกลับหรือข้ามได้ตลอด",
  },
  {
    id: "cover",
    title: "Cover",
    body: "ภาพปกของโปรไฟล์ กดไอคอนกล้องที่มุมเพื่ออัปโหลด ปรับตำแหน่ง หรือเปลี่ยนภาพ",
    target: "profile-cover",
  },
  {
    id: "avatar",
    title: "Profile photo",
    body: "รูปโปรไฟล์ของคุณ ขึ้นทุกที่ที่มีชื่อคุณ เช่น ฟีด คอมเมนต์ และการ์ดแพ็กเกจ",
    target: "profile-avatar",
  },
  {
    id: "edit",
    title: "Edit profile",
    body:
      "3 ส่วนใต้ชื่อ แก้ได้จากดินสอในหน้าต่างเดียว\n" +
      "• แถวบน — สายงาน: หมวดงานที่คุณทำ เช่น Graphic, Illustrator\n" +
      "• แถวกลาง — กำลังมองหา: สิ่งที่เปิดรับ เช่น หางานจ้าง ร่วมโปรเจกต์\n" +
      "• แถวล่าง — แนะนำตัว: ประโยคสั้น ๆ ให้คนรู้จักคุณ",
    target: "profile-edit",
  },
  {
    id: "stats",
    title: "Numbers",
    body: "จำนวนผลงาน ผู้ติดตาม และคนที่คุณติดตาม กดที่ตัวเลขเพื่อดูรายชื่อ",
    target: "profile-stats",
  },
  {
    id: "actions",
    title: "Quick actions",
    body: "My Studio คือที่จัดการงานและรายได้ “+” สำหรับโพสต์ในชุมชน และ “…” มีดูในมุมผู้เข้าชม ตั้งค่า และแชร์โปรไฟล์",
    target: "profile-actions",
    optional: true,
  },
  {
    id: "tabs",
    title: "Tabs",
    body: "โปรไฟล์แบ่งเป็น 4 หมวด ตัวเลขข้างชื่อคือจำนวนในหมวดนั้น",
    target: "profile-tabs",
  },
  {
    id: "overall",
    title: "My Projects",
    body: "ผลงานทั้งหมดของคุณ เรียงตามลำดับที่ผู้เข้าชมเห็น ปักหมุดงานเด่นได้ และกด “จัดลำดับ” เพื่อลากเรียงใหม่",
    target: "profile-tab-overall",
    tab: "overall",
  },
  {
    id: "collections",
    title: "Collections",
    body: "ที่เก็บผลงานของคนอื่นที่คุณชอบ จัดเป็นกลุ่ม ตั้งเป็นสาธารณะและแชร์ลิงก์ได้",
    target: "profile-tab-collections",
    tab: "collections",
  },
  {
    id: "booking",
    title: "Packages Saved",
    body: "แพ็กเกจของครีเอเตอร์คนอื่นที่คุณบันทึกไว้ ใส่สถานะ โน้ต และเปรียบเทียบก่อนตัดสินใจจ้างได้ (ไม่ใช่แพ็กเกจที่คุณขาย)",
    target: "profile-tab-booking",
    tab: "booking",
  },
  {
    id: "about",
    title: "About Me",
    body: "เอกสารแนะนำตัวแบบ CV สร้างเป็น PDF ได้ และมีลิงก์สำหรับส่งให้คนอื่น",
    target: "profile-tab-about",
    tab: "about",
  },
  {
    id: "final",
    title: "That's it",
    body: "เปิดดูทัวร์นี้ซ้ำได้ทุกเมื่อจากปุ่ม “?” ข้างแถบหมวด",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tab currently shown; the tour puts it back when it ends. */
  currentTab: string;
  onShowTab: (tab: string) => void;
};

function placeCard(rect: DOMRect | null): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) {
    // Phones: a full-width card above the bottom nav, so it never covers the spotlight from below.
    return { left: 12, right: 12, bottom: 96 };
  }
  const W = 320;
  const H = 200;
  if (!rect) return { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  let left = rect.left + rect.width / 2 - W / 2;
  let top = rect.bottom + 16;
  if (top + H > vh) top = Math.max(12, rect.top - H - 16);
  // A target that fills the screen: keep the card on the lower part.
  if (rect.height > vh * 0.6) top = vh - H - 24;
  left = Math.min(Math.max(12, left), vw - W - 12);
  top = Math.min(Math.max(12, top), vh - H - 12);
  return { left, top };
}

/** Look-only walkthrough of the owner's profile page: next / back, nothing to click for real. */
export function ProfileTour({ open, onClose, currentTab, onShowTab }: Props) {
  const startTab = useRef(currentTab);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = useMemo(
    () => (open ? STEPS.filter((s) => !s.optional || !s.target || findTarget(s.target)) : []),
    [open],
  );
  const step = steps[index];

  useEffect(() => {
    if (open) {
      setIndex(0);
      startTab.current = currentTab;
    }
    // currentTab is read only when the tour opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && step?.tab) onShowTab(step.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id]);

  const close = useCallback(() => {
    markProfileTourSeen();
    onShowTab(startTab.current);
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const next = () => (index + 1 >= steps.length ? close() : setIndex(index + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1 >= steps.length ? i : i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length]);

  // Follow the target through scroll, resize and re-render.
  useEffect(() => {
    if (!open || !step?.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = findTarget(step.target as string);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    findTarget(step.target)?.scrollIntoView({ block: "center", behavior: "smooth" });
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

  if (!open || !step) return null;

  const last = index === steps.length - 1;
  return (
    <>
      <Spotlight rect={rect} />
      {createPortal(
        <div
          role="dialog"
          aria-label="ทัวร์แนะนำหน้าโปรไฟล์"
          className={cn("pointer-events-auto fixed z-[70] w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-4 text-left shadow-xl max-sm:w-auto")}
          style={placeCard(rect)}
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
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{step.body}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="mr-auto text-[11px] tabular-nums text-muted-foreground">
              {index + 1}/{steps.length}
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
        </div>,
        document.body,
      )}
    </>
  );
}
