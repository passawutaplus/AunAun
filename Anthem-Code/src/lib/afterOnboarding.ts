import { isAuthRoute } from "@/lib/onboardingRoutes";
import { safeRelativePath } from "@/lib/safeUrl";

/**
 * Where a new member was heading before sign-up sent them home for the interest survey
 * (e.g. "Add work" → /portfolio/new). The survey sends them on there when it finishes.
 */
const KEY = "samecor:after-onboarding";

export function rememberAfterOnboarding(path: string | null | undefined): void {
  const dest = safeRelativePath(path, "/");
  if (dest === "/" || isAuthRoute(dest.split("?")[0] ?? dest)) return;
  try {
    sessionStorage.setItem(KEY, dest);
  } catch {
    /* storage blocked: the member lands on home, as before */
  }
}

export function takeAfterOnboarding(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const dest = safeRelativePath(raw, "/");
    return dest === "/" ? null : dest;
  } catch {
    return null;
  }
}
