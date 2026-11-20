/**
 * SAMECOR web origin for links and images in emails, LINE messages and in-app notifications.
 * Small on purpose: functions that only need a link import this instead of the email templates.
 */
export const SAMECOR_SITE = "https://samecor.com";

/** Old brand domains (Aplus1 / An1hem). They no longer serve the app, so never link to them. */
const RETIRED_HOST = /^(?:www\.)?(?:aplus1\.app|an1hem\.app)$/i;

/** `APLUS1_APP_URL` / `ANTHEM_APP_URL` when they hold a live origin, else https://samecor.com (no trailing slash). */
export function samecorSiteUrl(): string {
  for (const key of ["APLUS1_APP_URL", "ANTHEM_APP_URL"]) {
    const raw = Deno.env.get(key)?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (
        (url.protocol === "https:" || url.protocol === "http:") &&
        !RETIRED_HOST.test(url.hostname)
      ) {
        return raw.replace(/\/+$/, "");
      }
    } catch {
      // Not a URL: ignore it like an old-brand value.
    }
  }
  return SAMECOR_SITE;
}

/**
 * Absolute link on the SAMECOR site: a path gets the site origin, an old-brand URL keeps its path on
 * the site origin, anything else (other sites, template expressions) is returned unchanged.
 */
export function samecorLink(link: string, site = samecorSiteUrl()): string {
  const value = link.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return `${site}${value}`;
  try {
    const url = new URL(value);
    if (RETIRED_HOST.test(url.hostname)) return `${site}${url.pathname}${url.search}${url.hash}`;
  } catch {
    // Relative or not a URL: leave it.
  }
  return value;
}
