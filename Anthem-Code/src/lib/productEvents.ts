/**
 * First-party product analytics for SAMECOR.
 * Requires analytics cookie consent. Never throws into UX.
 */

import { supabase } from "@/integrations/supabase/client";
import { isAndroidApp, isStandaloneDisplay } from "@/lib/appShell";
import { isCategoryAllowed } from "@/lib/cookieConsent";
import { noteRatingMoment } from "@/lib/ratingPrompt";

export type ProductEventName =
  | "page_view"
  | "page_dwell"
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
  | "ad_impression"
  // Free-launch funnel (Discover → Connect → Hire / Collaborate)
  | "connect_message"
  | "proposal_send"
  | "proposal_accept"
  | "workspace_open"
  | "task_create"
  | "onboarding_step";

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
    // Local-only Beta rating moment; independent of analytics consent
    if (eventName === "hire_submit") noteRatingMoment("first_hire");
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
        // shell: android app / installed PWA / browser — lets app usage be split from web.
        _props: { ...props, shell: isAndroidApp() ? "android" : isStandaloneDisplay() ? "pwa" : "web" },
        _app: "aplus1",
      } as never,
    );
  } catch {
    /* swallow — analytics must never break UX */
  }
}
