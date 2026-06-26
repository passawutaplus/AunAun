/** So1o My Desk (back-office) — quotations, clients, finance, briefs. */
export const SO1O_APP_URL =
  (import.meta.env.VITE_SO1O_APP_URL as string | undefined) ?? "http://localhost:3000";

/** Subscribe / manage Pro on So1o (canonical billing). */
export const SO1O_PRICING_URL = `${SO1O_APP_URL.replace(/\/$/, "")}/pricing`;

/** So1o Ops Hub — monitor So1o + Aplus1 (admin only). */
const OPS_HUB_FALLBACK = import.meta.env.DEV
  ? "http://localhost:3090"
  : "https://so1o-ops-hub.vercel.app";

export const OPS_HUB_URL =
  (import.meta.env.VITE_OPS_HUB_URL as string | undefined)?.replace(/\/$/, "") ?? OPS_HUB_FALLBACK;
