import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { enablePush, getPushState } from "@/lib/pushNotifications";

const DISMISS_KEY = "samecor:studio-push-nudge-dismissed-at";
const DISMISS_DAYS = 14;

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** My Studio: asks once in a while to turn on phone notifications, so requests don't sit unanswered. */
export default function StudioPushNudge() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dismissedRecently()) return;
    let alive = true;
    // Only "off" can be fixed with one tap — denied / unsupported / not configured stay quiet
    void getPushState().then((s) => alive && setShow(s === "off"));
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage blocked — hides for this page view only */
    }
    setShow(false);
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      const s = await enablePush();
      if (s === "on") {
        toast.success("เปิดแจ้งเตือนแล้ว");
        setShow(false);
      } else if (s === "denied") {
        toast.error("เบราว์เซอร์บล็อกการแจ้งเตือนไว้ เปิดได้จากการตั้งค่าเว็บไซต์");
        setShow(false);
      }
    } catch {
      toast.error("เปิดแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="ปิด"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
          <BellRing className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">ไม่พลาดคำขอจ้าง</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">เปิดแจ้งเตือนบนเครื่องนี้ มีคนทักหรือชวนงานจะเด้งบอกทันที</p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void turnOn()}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
      >
        <BellRing className="h-4 w-4" /> เปิดแจ้งเตือน
      </button>
    </section>
  );
}
