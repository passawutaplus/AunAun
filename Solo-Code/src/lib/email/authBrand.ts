export type AuthEmailBrand = "solo" | "anthem";

const ANTHEM_HOST_PATTERNS = [
  "pixel100.com",
  "1px.app",
  "1px.net",
  "px1.app",
  "anthem",
  "an1hem.app",
];

/**
 * Pick auth email brand from the confirmation redirect URL in the Supabase hook payload.
 */
export function resolveAuthEmailBrand(confirmationUrl?: string | null): AuthEmailBrand {
  if (!confirmationUrl) return "solo";

  try {
    const host = new URL(confirmationUrl).hostname.toLowerCase();
    if (ANTHEM_HOST_PATTERNS.some((p) => host === p || host.endsWith(`.${p}`))) {
      return "anthem";
    }

    const anthemSite = process.env.ANTHEM_SITE_URL || process.env.VITE_ANTHEM_SITE_URL;
    if (anthemSite) {
      const anthemHost = new URL(anthemSite).hostname.toLowerCase();
      if (host === anthemHost) return "anthem";
    }
  } catch {
    // fall through
  }

  return "solo";
}
