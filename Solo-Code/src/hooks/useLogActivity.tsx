import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

const STORAGE_PREFIX = "so1o.lastActivityLog.";
// 1 ครั้ง/ชั่วโมง ตามฝั่ง DB (กัน round-trip ซ้ำๆ ฝั่ง client ด้วย)
const THROTTLE_MS = 60 * 60 * 1000;

/**
 * บันทึก user_activity_logs (1 ครั้ง/ชั่วโมง/ผู้ใช้/ประเภท)
 * เรียกที่ root ของหน้าที่ต้องการนับ traffic เช่น Dashboard
 */
export function useLogActivity(
  userId: string | null | undefined,
  activityType: string = "page_view",
) {
  React.useEffect(() => {
    if (!userId || !hasAnalyticsConsent()) return;
    const key = `${STORAGE_PREFIX}${userId}.${activityType}`;
    const log = async () => {
      try {
        const last = Number(localStorage.getItem(key) ?? 0);
        const now = Date.now();
        if (now - last < THROTTLE_MS) return;
        localStorage.setItem(key, String(now));
        await supabase.rpc("log_user_activity", { _activity_type: activityType });
      } catch {
        /* silent */
      }
    };
    log();
  }, [userId, activityType]);
}
