/**
 * First-party product analytics for Aplus1.
 * Requires analytics cookie consent. Never throws into UX.
 */

import { supabase } from "@/integrations/supabase/client";
import { isCategoryAllowed } from "@/lib/cookieConsent";

export type ProductEventName =
  | "page_view"
  | "project_view"
  | "profile_view"
  | "feed_search"
  | "hire_open"
  | "hire_submit"
  | "collab_open"
  | "collab_submit"
  | "job_apply"
  | "follow_click"
  | "share_click"
  | "cta_ecosystem"
  | "collection_save"
  | "inspire_click"
  | "ad_click"
  | "ad_impression";

const SESSION_KEY = "aplus1_analytics_sid";
const lastSent = new Map<string, number>();
const DEFAULT_DEBOUNCE_MS = 2_000;

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

export async function trackProductEvent(
  eventName: ProductEventName,
  props: Record<string, unknown> = {},
  opts?: { debounceMs?: number; path?: string },
): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (!isCategoryAllowed("analytics")) return;

    const debounceMs = opts?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    const path = opts?.path ?? `${window.location.pathname}${window.location.search}`;
    const key = `${eventName}:${path}:${JSON.stringify(props)}`;
    const now = Date.now();
    const last = lastSent.get(key) ?? 0;
    if (now - last < debounceMs) return;
    lastSent.set(key, now);

    const referrer = document.referrer ? document.referrer.slice(0, 500) : null;
    await supabase.rpc(
      "log_product_event" as never,
      {
        _event_name: eventName,
        _session_id: getAnalyticsSessionId(),
        _path: path.slice(0, 500),
        _referrer: referrer,
        _props: props,
        _app: "aplus1",
      } as never,
    );
  } catch {
    /* swallow — analytics must never break UX */
  }
}
