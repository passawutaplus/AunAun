import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

const STORAGE_KEY = "so1o.lastActiveBumpAt";
const THROTTLE_MS = 5 * 60 * 1000; // 5 นาที

/**
 * อัปเดต last_active_at ของผู้ใช้ปัจจุบัน (throttle 5 นาที/แท็บ)
 * เรียกครั้งเดียวที่ระดับ AuthProvider scope (เช่น Dashboard root)
 */
export function useTrackActivity(userId: string | null | undefined) {
  React.useEffect(() => {
    if (!userId || !hasAnalyticsConsent()) return;
    let cancelled = false;

    const bump = async () => {
      try {
        const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
        const now = Date.now();
        if (now - last < THROTTLE_MS) return;
        localStorage.setItem(STORAGE_KEY, String(now));
        await supabase.rpc("touch_last_active");
      } catch {
        /* silent */
      }
    };

    if (!cancelled) bump();

    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);
}
