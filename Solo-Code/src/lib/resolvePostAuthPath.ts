import { safeRelativePath } from "@/lib/safeUrl";
import { isEarlyAccessMode } from "@/lib/publicAccess";

/** Where to send the user after login/signup/OAuth. */
export function resolvePostAuthPath(opts: {
  rawRedirect?: string | null;
  isAdmin: boolean;
  testerApproved?: boolean;
}): string {
  if (opts.rawRedirect) {
    return safeRelativePath(opts.rawRedirect, "/dashboard");
  }
  if (isEarlyAccessMode() && !opts.isAdmin && !opts.testerApproved) {
    return "/apply";
  }
  if (opts.isAdmin) {
    return "/admin";
  }
  return "/dashboard";
}

/** Build absolute email confirmation redirect from current `?redirect=` param. */
export function emailRedirectUrlFromSearch(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const path = resolvePostAuthPath({
    rawRedirect: params.get("redirect"),
    isAdmin: false,
    testerApproved: false,
  });
  return `${window.location.origin}${path}`;
}
