import { isNativeApp } from "@/lib/appShell";

/** `"true"` / `"false"` win; with nothing set the answer is "on" only on the local dev server. */
function flag(value: unknown): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return import.meta.env.MODE === "development";
}

/**
 * Support Us (Support hub, Shop, Donate, Sponsor & Collaborate).
 * Off in production until the owner sets VITE_SUPPORT_SPACE_ENABLED=true.
 * Never inside the Android app: paying there has its own store rules.
 */
export function isSupportSpaceEnabled(): boolean {
  if (isNativeApp()) return false;
  return flag(import.meta.env.VITE_SUPPORT_SPACE_ENABLED);
}

/**
 * Test mode: shows the sample products and lets checkout, Donate and the sponsor form run to the end
 * with no charge and nothing sent. Every screen says so. Set VITE_SUPPORT_DEMO=true to try it on a preview build.
 */
export function isSupportDemo(): boolean {
  return isSupportSpaceEnabled() && flag(import.meta.env.VITE_SUPPORT_DEMO);
}

export const SUPPORT_ROUTE_PATTERNS: readonly RegExp[] = [/^\/support(\/|$)/, /^\/shop(\/|$)/];

/** True for a Support / Shop URL while the space is switched off. */
export function isSupportPath(pathname: string): boolean {
  return !isSupportSpaceEnabled() && SUPPORT_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/** LINE Official Account for sponsors and partners (owner, 2026-11-12). */
export const SUPPORT_LINE_URL = "https://lin.ee/6JjkgOk";
export const SUPPORT_LINE_QR_URL = "https://qr-official.line.me/gs/M_567rveid_GW.png?oat_content=qr";

/** Monthly running cost the Donate page counts towards. */
export const DONATE_GOAL_THB = 5000;
export const DONATE_AMOUNTS_THB = [49, 99, 199, 499] as const;
export const DONATE_MIN_THB = 20;
export const DONATE_MAX_THB = 50000;
