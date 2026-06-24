/** External products in the So1o ecosystem (not hosted in this app). */
export const ANTHEM_SHOWCASE_URL =
  (import.meta.env.VITE_ANTHEM_APP_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:8081/" : "https://1px-demo.vercel.app/");

const OPS_HUB_FALLBACK = import.meta.env.DEV
  ? "http://localhost:3090"
  : "https://so1o-ops-hub.vercel.app";

export const OPS_HUB_URL =
  (import.meta.env.VITE_OPS_HUB_URL as string | undefined)?.replace(/\/$/, "") ?? OPS_HUB_FALLBACK;

function anthemBaseUrl() {
  return ANTHEM_SHOWCASE_URL.replace(/\/$/, "");
}

/** Public showcase feed (an1hem). */
export function anthemShowcaseUrl() {
  return `${anthemBaseUrl()}/`;
}

/**
 * Handoff to an1hem profile — anthem can resolve `so1o_uid` when SSO is unified.
 */
export function anthemProfileUrl(so1oUserId?: string | null) {
  const base = anthemBaseUrl();
  if (so1oUserId) {
    return `${base}/profile?so1o_uid=${encodeURIComponent(so1oUserId)}`;
  }
  return `${base}/profile`;
}

export const FREE_QUOTATION_URL = "https://freelance-invoice-taupe.vercel.app/";

/**
 * Target Supabase project for unified auth (Anthem backend per docs/schema-reorganize).
 * Set VITE_SUPABASE_* in both apps to the same project when consolidating accounts.
 */
export const UNIFIED_SUPABASE_PROJECT_ID =
  (import.meta.env.VITE_UNIFIED_SUPABASE_PROJECT_ID as string | undefined) ?? "";
