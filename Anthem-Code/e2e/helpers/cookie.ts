import type { Page } from "@playwright/test";

const CONSENT_STATE = {
  version: 1,
  decidedAt: "2026-01-01T00:00:00.000Z",
  essential: true as const,
  functional: true,
  analytics: true,
};

/** Pre-seed PDPA consent so the cookie banner does not block auth clicks in smoke/E2E. */
export async function seedCookieConsent(page: Page) {
  await page.addInitScript((state) => {
    localStorage.setItem("anthem-cookie-consent", JSON.stringify(state));
  }, CONSENT_STATE);
}
