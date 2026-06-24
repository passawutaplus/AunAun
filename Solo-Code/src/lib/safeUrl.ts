/**
 * Safe URL / redirect helpers — extends src/lib/security.ts.
 *
 * Use these at every boundary that interpolates user input into:
 * - <a href={...}>
 * - window.location / window.open
 * - router.navigate({ to: redirect })
 */

import { safeUrl, safeHref } from "./security";

export { safeUrl, safeHref };

/**
 * Validate a `?redirect=` query param.
 * Allows only:
 *   - relative paths starting with "/" (not "//" or "/\")
 * Rejects:
 *   - Absolute URLs (open redirect risk)
 *   - Protocol-relative ("//evil.com")
 *   - Backslash-prefixed ("/\evil.com" — some browsers interpret as protocol-relative)
 *   - "javascript:", "data:", etc.
 *
 * Returns the safe path, or a fallback if unsafe.
 */
export function safeRelativePath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s) return fallback;
  if (!s.startsWith("/")) return fallback;
  // block protocol-relative & backslash tricks
  if (s.startsWith("//") || s.startsWith("/\\") || s.startsWith("/%2f") || s.startsWith("/%5c"))
    return fallback;
  // block any scheme injection ("/javascript:...")
  if (/[a-z][a-z0-9+.-]*:/i.test(s.slice(1, 50))) return fallback;
  return s;
}

/**
 * Validate that a URL points to an allowed http(s) host.
 * Returns the URL string if safe, null otherwise.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return safeUrl(String(raw));
}
