import { supabase } from "@/integrations/supabase/client";

/**
 * Records a feature-usage event for the current user.
 * Silent on failure (analytics must never break UX).
 * Debounced per (user, feature) to avoid spamming on remounts —
 * one event per feature per 30 seconds per session.
 */
const lastSent = new Map<string, number>();
const WINDOW_MS = 30_000;

export async function trackFeature(feature: string) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    const key = `${uid}:${feature}`;
    const now = Date.now();
    const last = lastSent.get(key) ?? 0;
    if (now - last < WINDOW_MS) return;
    lastSent.set(key, now);

    await supabase.from("feature_usage_events").insert({
      user_id: uid,
      feature,
    });
  } catch {
    /* swallow */
  }
}
