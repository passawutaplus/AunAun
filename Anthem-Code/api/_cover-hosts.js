/**
 * Which remote image hosts a server-side fetch may touch (push-collage, SEC-14).
 * Pure helpers, unit-tested in scripts/__tests__/coverHosts.test.mjs.
 */

const STATIC_COVER_HOSTS = ["images.unsplash.com"];

/** Hosts a cover may be fetched from: the configured Supabase project, Unsplash, and an optional env list. */
export function coverHostAllowlist(baseUrl, extra = process.env.PUSH_COLLAGE_COVER_HOSTS) {
  const hosts = new Set(STATIC_COVER_HOSTS);
  try {
    hosts.add(new URL(baseUrl).hostname.toLowerCase());
  } catch {
    /* no supabase url: only the static hosts remain */
  }
  for (const h of String(extra || "").split(/[\s,]+/)) {
    if (h) hosts.add(h.toLowerCase());
  }
  return hosts;
}

/** True only for an https URL on an allow-listed host, with no credentials, port or IP literal. */
export function isAllowedCoverUrl(raw, allowed) {
  let u;
  try {
    u = new URL(String(raw));
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.includes(":") || /^[\d.]+$/.test(host)) return false;
  return allowed.has(host);
}
