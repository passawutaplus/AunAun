import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

const STORAGE_KEY = "so1o.deviceTracked";
const SESSION_ID_KEY = "so1o.sessionId";

function detectDeviceType(width: number, ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (width >= 641 && width <= 1024)) {
    return "tablet";
  }
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || width <= 640) {
    return "mobile";
  }
  return "desktop";
}

function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua) && !/Mobile/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  return "Other";
}

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export async function trackDeviceOnce() {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.setItem(STORAGE_KEY, "1");

    const ua = navigator.userAgent || "";
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const deviceType = detectDeviceType(width, ua);
    const os = detectOS(ua);
    const browser = detectBrowser(ua);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;

    await supabase.from("user_device_events").insert({
      user_id: uid,
      session_id: getOrCreateSessionId(),
      device_type: deviceType,
      os,
      browser,
      viewport_width: width,
      viewport_height: height,
      pixel_ratio: dpr,
      user_agent: ua.slice(0, 500),
    });
  } catch {
    /* silent */
  }
}
