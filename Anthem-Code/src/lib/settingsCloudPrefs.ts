/**
 * Per-account copy of settings that used to live only in this browser (bell kinds, language, timezone,
 * rating prompt opt-out) — stored in profiles.ui_prefs so they follow the user to other devices.
 * localStorage stays the fast read path; this file only syncs. Never throws.
 */
import { supabase } from "@/integrations/supabase/client";
import { saveInAppNotifyPrefs, type InAppNotifyKey } from "@/lib/inAppNotifyPrefs";
import { loadLocalePrefs, saveLocalePrefs, type AppLocale } from "@/lib/localePrefs";

export type CloudPrefs = {
  inApp?: Partial<Record<InAppNotifyKey, boolean>>;
  locale?: AppLocale;
  timezone?: string;
  ratingPromptOff?: boolean;
  /** Guide tour progress per page (see lib/guideTours.ts) */
  tours?: Record<string, { v: number; done?: boolean; off?: boolean }>;
};

const cacheKey = (userId: string) => `samecor:cloud-prefs:${userId}`;

function readCache(userId: string): CloudPrefs {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) ?? "{}") as CloudPrefs;
  } catch {
    return {};
  }
}

function writeCache(userId: string, prefs: CloudPrefs) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(prefs));
  } catch {
    /* storage blocked */
  }
}

export function cachedCloudPrefs(userId: string | null | undefined): CloudPrefs {
  return userId ? readCache(userId) : {};
}

/** Merge a patch into the account copy. Resolves false when the column is missing or offline. */
export async function pushCloudPrefs(userId: string, patch: CloudPrefs): Promise<boolean> {
  const next = { ...readCache(userId), ...patch };
  writeCache(userId, next);
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ ui_prefs: next } as never)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

/** Pull the account copy into this browser (once per sign-in). */
export async function pullCloudPrefs(userId: string): Promise<CloudPrefs | null> {
  try {
    // Owner-only RPC: ui_prefs has no column SELECT grant
    const { data, error } = await supabase.rpc("get_my_ui_prefs" as never);
    if (error) return null;
    const prefs = (data ?? null) as CloudPrefs | null;
    if (!prefs) return null;
    writeCache(userId, prefs);
    if (prefs.inApp) {
      saveInAppNotifyPrefs(userId, {
        hire: true,
        collab: true,
        follow: true,
        chat: true,
        community: true,
        workLike: true,
        system: true,
        ...prefs.inApp,
      });
    }
    if (prefs.locale || prefs.timezone) {
      const local = loadLocalePrefs();
      saveLocalePrefs({ locale: prefs.locale ?? local.locale, timezone: prefs.timezone ?? local.timezone });
    }
    return prefs;
  } catch {
    return null;
  }
}
