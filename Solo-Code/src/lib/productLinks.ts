/** External products in the So1o ecosystem (not hosted in this app). */

function readAplus1AppUrl(): string | undefined {
  return (
    (import.meta.env.VITE_APLUS1_APP_URL as string | undefined) ??
    (import.meta.env.VITE_ANTHEM_APP_URL as string | undefined)
  );
}

export const APLUS1_SHOWCASE_URL =
  readAplus1AppUrl() ?? (import.meta.env.DEV ? "http://localhost:8081/" : "https://aplus1.app/");

/** @deprecated use APLUS1_SHOWCASE_URL */
export const ANTHEM_SHOWCASE_URL = APLUS1_SHOWCASE_URL;

const OPS_HUB_FALLBACK = import.meta.env.DEV
  ? "http://localhost:3090"
  : "https://so1o-ops-hub.vercel.app";

export const OPS_HUB_URL =
  (import.meta.env.VITE_OPS_HUB_URL as string | undefined)?.replace(/\/$/, "") ?? OPS_HUB_FALLBACK;

function aplus1BaseUrl() {
  return APLUS1_SHOWCASE_URL.replace(/\/$/, "");
}

/** Public showcase feed (Aplus1). */
export function aplus1ShowcaseUrl() {
  return `${aplus1BaseUrl()}/`;
}

/** @deprecated use aplus1ShowcaseUrl */
export const anthemShowcaseUrl = aplus1ShowcaseUrl;

/**
 * Handoff to Aplus1 profile — resolves `so1o_uid` when SSO is unified.
 */
export function aplus1ProfileUrl(so1oUserId?: string | null) {
  const base = aplus1BaseUrl();
  if (so1oUserId) {
    return `${base}/profile?so1o_uid=${encodeURIComponent(so1oUserId)}`;
  }
  return `${base}/profile`;
}

/** @deprecated use aplus1ProfileUrl */
export const anthemProfileUrl = aplus1ProfileUrl;

export const FREE_QUOTATION_URL = "https://freelance-invoice-taupe.vercel.app/";

/**
 * Target Supabase project for unified auth (Aplus1 backend).
 * Set VITE_SUPABASE_* in both apps to the same project when consolidating accounts.
 */
export const UNIFIED_SUPABASE_PROJECT_ID =
  (import.meta.env.VITE_UNIFIED_SUPABASE_PROJECT_ID as string | undefined) ?? "";
