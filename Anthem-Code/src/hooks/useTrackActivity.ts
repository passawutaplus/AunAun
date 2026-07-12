import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "aplus1.lastActiveBumpAt";
/** Keep under the admin "online" window (5 minutes). */
const THROTTLE_MS = 2 * 60 * 1000;

/**
 * Bump profiles.last_active_at for the signed-in user (throttled).
 * Mount once under AuthProvider — session heartbeat for admin presence, not marketing analytics.
 */
export function useTrackActivity(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const bump = async () => {
      try {
        const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
        const now = Date.now();
        if (now - last < THROTTLE_MS) return;
        localStorage.setItem(STORAGE_KEY, String(now));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)("touch_last_active");
      } catch {
        /* silent — RPC may be unavailable offline */
      }
    };

    if (!cancelled) void bump();

    const onVisible = () => {
      if (document.visibilityState === "visible") void bump();
    };
    const onFocus = () => void bump();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void bump();
    }, THROTTLE_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [userId]);
}
