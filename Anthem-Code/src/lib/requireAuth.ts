import { useAuthDialog } from "@/stores/authDialogStore";
import type { User } from "@supabase/supabase-js";

/**
 * Wrap an action so guests get the auth dialog instead of executing it.
 * Returns true if the action ran, false if auth was required.
 */
export const requireAuth = (user: User | null | undefined, action: () => void): boolean => {
  if (!user) {
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    useAuthDialog.getState().openSignup(path);
    return false;
  }
  action();
  return true;
};

/** Hook variant: returns a wrapper that gates a handler. */
export const useGatedAction = (user: User | null | undefined) => {
  return <T extends (...args: any[]) => any>(fn: T) =>
    ((...args: Parameters<T>) => {
      if (!user) {
        const path =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/";
        useAuthDialog.getState().openSignup(path);
        return;
      }
      return fn(...args);
    }) as T;
};
