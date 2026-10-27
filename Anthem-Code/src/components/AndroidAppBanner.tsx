import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { isAndroidApp, isStandaloneDisplay } from "@/lib/appShell";

/** Play Store listing — the app id from android/twa-manifest.json. */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.samecor.twa&utm_source=samecor_web&utm_medium=banner";

const DISMISS_KEY = "samecor:android-banner-dismissed-at";
const DISMISS_DAYS = 30;
const SHOW_DELAY_MS = 4000;
/** Pages where a small card above the bottom nav doesn't cover anything important. */
const SHOW_ON = [/^\/$/, /^\/project\/[^/]+$/, /^\/u\/[^/]+$/];

/** Off until the app is live on Google Play — fail-closed. */
function isPlayStoreLive(): boolean {
  return import.meta.env.VITE_PLAY_STORE_LIVE === "true";
}

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Android phones browsing the website: a dismissible "get the app" card above the bottom nav. */
export default function AndroidAppBanner() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  const eligible =
    isPlayStoreLive() &&
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent) &&
    !isAndroidApp() &&
    !isStandaloneDisplay() &&
    SHOW_ON.some((re) => re.test(pathname));

  useEffect(() => {
    if (!eligible || dismissedRecently()) return;
    const id = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [eligible]);

  if (!eligible || !visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage blocked — hides for this page view only */
    }
    setVisible(false);
  };

  return (
    <div
      className="lg:hidden fixed inset-x-3 z-30 mx-auto max-w-sm"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/95 p-2.5 pr-2 shadow-lg backdrop-blur">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">SAMECOR บน Android</p>
          <p className="truncate text-xs text-muted-foreground">ลงผลงานและรับแจ้งเตือนแชทได้ไวกว่า</p>
        </div>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-foreground px-3.5 py-2 text-xs font-medium text-background"
        >
          ดาวน์โหลด
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิด"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
