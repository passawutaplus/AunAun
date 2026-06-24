import type { IssuerSnapshot } from "@/lib/quotationKinds";
import type { QuotationKind } from "@/lib/quotationKinds";

export function resolveQuotationSenderName(opts: {
  quotationKind?: QuotationKind;
  orgSnapshot?: IssuerSnapshot | null;
  studioSnapshot?: IssuerSnapshot | null;
  profileBrandName?: string | null;
  profileDisplayName?: string | null;
  fallback?: string;
}): string {
  const fallback = opts.fallback ?? "So1o Freelancer";
  if (opts.quotationKind === "inhouse" && opts.orgSnapshot?.brandName?.trim()) {
    return opts.orgSnapshot.brandName.trim();
  }
  if (opts.quotationKind === "studio" && opts.studioSnapshot?.brandName?.trim()) {
    return opts.studioSnapshot.brandName.trim();
  }
  return opts.profileBrandName?.trim() || opts.profileDisplayName?.trim() || fallback;
}
