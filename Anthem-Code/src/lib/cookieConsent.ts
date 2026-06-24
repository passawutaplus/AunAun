/** Cookie / local storage consent (PDPA + กฎหมายคุกกี้ไทย) */

export const COOKIE_CONSENT_STORAGE_KEY = "anthem-cookie-consent";

/** เพิ่มเมื่อเปลี่ยนนโยบายคุกกี้อย่างมีนัย — จะแสดงแบนเนอร์ใหม่ */
export const COOKIE_CONSENT_VERSION = 1;

export type CookieCategory = "essential" | "functional" | "analytics";

export interface CookieConsentPreferences {
  version: number;
  decidedAt: string;
  essential: true;
  functional: boolean;
  analytics: boolean;
}

export const COOKIE_PREFERENCES_OPEN_EVENT = "anthem:open-cookie-preferences";

export function requestOpenCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_OPEN_EVENT));
}

function migrateLegacyConsent(): CookieConsentPreferences | null {
  const legacy = localStorage.getItem("cookie-consent");
  if (legacy === "accepted") {
    localStorage.removeItem("cookie-consent");
    return acceptAllCookies();
  }
  if (legacy === "essential") {
    localStorage.removeItem("cookie-consent");
    return acceptEssentialOnly();
  }
  return null;
}

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return migrateLegacyConsent();
    const parsed = JSON.parse(raw) as CookieConsentPreferences;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (!parsed.decidedAt || parsed.essential !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCookieConsent(prefs: Omit<CookieConsentPreferences, "version" | "decidedAt" | "essential">) {
  const state: CookieConsentPreferences = {
    version: COOKIE_CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    essential: true,
    functional: prefs.functional,
    analytics: prefs.analytics,
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function acceptAllCookies() {
  return writeCookieConsent({ functional: true, analytics: true });
}

export function acceptEssentialOnly() {
  return writeCookieConsent({ functional: false, analytics: false });
}

export function hasConsentBannerPending(): boolean {
  return readCookieConsent() === null;
}

export function isCategoryAllowed(category: CookieCategory): boolean {
  if (category === "essential") return true;
  const c = readCookieConsent();
  if (!c) return category === "essential";
  if (category === "functional") return c.functional;
  return c.analytics;
}

/** ลบค่าที่ไม่จำเป็นเมื่อผู้ใช้ถอนความยินยอม (ไม่แตะ session auth ของ Supabase) */
export function clearNonEssentialStorage() {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key === COOKIE_CONSENT_STORAGE_KEY) continue;
    if (key.startsWith("sb-")) continue;
    if (key === "feed-mode" || key === "theme") continue;
    keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  const sessionKeys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (key.startsWith("viewed:")) sessionKeys.push(key);
  }
  sessionKeys.forEach((k) => sessionStorage.removeItem(k));
}
