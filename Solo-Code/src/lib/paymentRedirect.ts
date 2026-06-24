import { safeRelativePath } from "@/lib/safeUrl";

/** Build same-origin Stripe checkout redirect URLs from an optional ?return= path. */
export function buildCheckoutRedirectUrls(opts: {
  origin: string;
  returnParam: string | null;
  defaultSuccessPath: string;
  defaultCancelPath: string;
  successQuery: string;
  cancelQuery?: string;
}): { successUrl: string; cancelUrl: string } {
  const successBase = safeRelativePath(opts.returnParam, opts.defaultSuccessPath);
  const cancelBase = safeRelativePath(opts.returnParam, opts.defaultCancelPath);

  const successSep = successBase.includes("?") ? "&" : "?";
  const cancelSep = cancelBase.includes("?") ? "&" : "?";
  const cancelQuery = opts.cancelQuery ?? "canceled=1";

  return {
    successUrl: `${opts.origin}${successBase}${successSep}${opts.successQuery}`,
    cancelUrl: `${opts.origin}${cancelBase}${cancelSep}${cancelQuery}`,
  };
}

/** Safe return URL for Stripe billing portal / Connect (same origin only). */
export function currentOriginReturnUrl(): string {
  if (typeof window === "undefined") return "https://solofreelancer.com/dashboard";
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}`;
}
