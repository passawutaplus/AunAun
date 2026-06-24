/** Canonical public origin — override with VITE_SITE_URL on Vercel preview / staging. */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/$/, "") ||
  "https://solofreelancer.com";

export const SITE_NAME = "So1o Freelancer";

/** Default Open Graph / Twitter card image (1200×630 recommended). */
export const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/SB11sYmcAcWg6RHXTfd1y5NFKnt2/social-images/social-1777699020537-WELLCOME_(1).webp";

export function canonicalUrl(path: string): string {
  if (!path || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
