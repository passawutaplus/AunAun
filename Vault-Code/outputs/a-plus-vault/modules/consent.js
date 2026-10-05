/**
 * Consent (phase 12). Only what truly needs consent is asked, each choice is separate, off by default, withdrawable in Settings.
 * No analytics or advertising storage exists today, so NO banner is shown; `needsBanner` turns true only if the cookie inventory
 * ever gains a consent-requiring item (see docs/legal/COOKIE_INVENTORY.md).
 */
export const POLICY_VERSION = "2026-10-draft1";
export const CONSENT_KEY = "aplus_consent_v1";

export const PURPOSES = {
  ai_private_tagging: { label: "AI tagging of my private images", hint: "Sends a small downscaled copy and the title to the AI provider to suggest tags. Off by default; you can turn it off any time." },
  marketing_email: { label: "Weekly digest email", hint: "New images that match what you keep. One-click unsubscribe in every email." },
  analytics: { label: "Anonymous usage statistics", hint: "Not used today. Listed so the choice exists if it is ever added." },
};

/** Storage items that would need consent. Keep in sync with docs/legal/COOKIE_INVENTORY.md (a test checks it). */
export const CONSENT_REQUIRING_STORAGE = [];

export function needsBanner(inventory = CONSENT_REQUIRING_STORAGE) {
  return Array.isArray(inventory) && inventory.length > 0;
}

/** Global Privacy Control / Do Not Track count as "reject" for anything optional. */
export function privacySignalOn(nav = typeof navigator === "undefined" ? {} : navigator) {
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function readConsent() {
  try {
    const raw = JSON.parse(localStorage.getItem(CONSENT_KEY) || "{}");
    return raw && raw.policy === POLICY_VERSION ? raw.choices || {} : {};
  } catch {
    return {};
  }
}

/** Current choice for a purpose; default false (never pre-ticked). */
export function isGranted(purpose) {
  if (privacySignalOn() && purpose === "analytics") return false;
  return readConsent()[purpose] === true;
}

export function writeConsent(purpose, granted) {
  if (!(purpose in PURPOSES)) return false;
  try {
    const choices = { ...readConsent(), [purpose]: Boolean(granted) };
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ policy: POLICY_VERSION, choices, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function consentToggleMarkup(purpose, esc) {
  const p = PURPOSES[purpose];
  const on = isGranted(purpose);
  return `<label class='consent-toggle'><input type='checkbox' data-consent-toggle='${purpose}'${on ? " checked" : ""}><span><strong>${esc(p.label)}</strong><small>${esc(p.hint)}</small></span></label>`;
}
