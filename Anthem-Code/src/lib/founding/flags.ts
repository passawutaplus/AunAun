import { isNativeApp } from "@/lib/appShell";

/** `"true"` / `"false"` win; with nothing set the answer is "on" only on the local dev server. */
function flag(value: unknown): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return import.meta.env.MODE === "development";
}

/**
 * SAMECOR Founding Projects (first campaign: Picker, The First 30).
 * Off in production until the owner sets VITE_FOUNDING_ENABLED=true. Not shown inside the Android app.
 * The module can be switched off at any time without touching the shop or the Picker app.
 */
export function isFoundingEnabled(): boolean {
  if (isNativeApp()) return false;
  return flag(import.meta.env.VITE_FOUNDING_ENABLED);
}

/** Sign-ups made from a dev / preview build are stored as tests (and say so in the team's LINE alert). */
export function isFoundingTest(): boolean {
  return flag(import.meta.env.VITE_FOUNDING_TEST);
}

export const FOUNDING_ROUTE_PATTERNS: readonly RegExp[] = [/^\/founding(\/|$)/];

/** True for a Founding URL while the module is switched off. */
export function isFoundingPath(pathname: string): boolean {
  return !isFoundingEnabled() && FOUNDING_ROUTE_PATTERNS.some((re) => re.test(pathname));
}
