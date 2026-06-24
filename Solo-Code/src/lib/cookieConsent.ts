export const CONSENT_STORAGE_KEY = "so1o-cookie-consent";
export const CONSENT_MAX_AGE_DAYS = 180;
export const CONSENT_VERSION = 2;

export const OPEN_PREFERENCES_EVENT = "so1o:open-cookie-preferences";
export const CONSENT_CHANGE_EVENT = "so1o:cookie-consent-change";

export type CookieCategory = "essential" | "preferences" | "analytics";

export interface CookiePreferences {
  essential: true;
  preferences: boolean;
  analytics: boolean;
}

export interface StoredConsent {
  version: typeof CONSENT_VERSION;
  preferences: CookiePreferences;
  at: number;
}

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  preferences: false,
  analytics: false,
};

const ALL_PREFS: CookiePreferences = {
  essential: true,
  preferences: true,
  analytics: true,
};

type LegacyConsent = {
  value?: "all" | "essential" | "dismissed";
  at?: number;
};

function migrateLegacy(raw: LegacyConsent): StoredConsent | null {
  if (!raw.at) return null;
  const ageDays = (Date.now() - raw.at) / (1000 * 60 * 60 * 24);
  if (ageDays > CONSENT_MAX_AGE_DAYS) return null;

  if (raw.value === "all") {
    return { version: CONSENT_VERSION, preferences: ALL_PREFS, at: raw.at };
  }
  // essential + dismissed → essential-only
  return { version: CONSENT_VERSION, preferences: DEFAULT_PREFS, at: raw.at };
}

export function readCookieConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent | LegacyConsent;

    if ("version" in parsed && parsed.version === CONSENT_VERSION && parsed.preferences) {
      const ageDays = (Date.now() - parsed.at) / (1000 * 60 * 60 * 24);
      if (ageDays > CONSENT_MAX_AGE_DAYS) return null;
      return parsed as StoredConsent;
    }

    return migrateLegacy(parsed as LegacyConsent);
  } catch {
    return null;
  }
}

export function writeCookieConsent(preferences: CookiePreferences) {
  if (typeof window === "undefined") return;
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    preferences: { ...preferences, essential: true },
    at: Date.now(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: stored }));
  } catch {
    /* ignore */
  }
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.preferences.analytics ?? false;
}

export function hasPreferencesConsent(): boolean {
  return readCookieConsent()?.preferences.preferences ?? false;
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
}

export function clearCookieConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: null }));
  } catch {
    /* ignore */
  }
}

export const CATEGORY_LABELS: Record<CookieCategory, string> = {
  essential: "จำเป็น",
  preferences: "การตั้งค่า",
  analytics: "วิเคราะห์",
};
