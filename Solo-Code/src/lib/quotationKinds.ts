import type { DocumentThemeInput } from "@/lib/documentTheme";

export type QuotationKind = "solo" | "inhouse" | "studio";

export interface IssuerSnapshot {
  brandName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  legalName?: string | null;
  documentTheme?: DocumentThemeInput | null;
}

export interface StudioIssuerSnapshot extends IssuerSnapshot {
  studioId: string;
  studioName: string;
}

export function issuerFromQuotation(q: {
  quotationKind?: QuotationKind;
  orgSnapshot?: IssuerSnapshot | null;
  studioSnapshot?: IssuerSnapshot | null;
}): IssuerSnapshot | null {
  if (q.quotationKind === "inhouse" && q.orgSnapshot) return q.orgSnapshot;
  if (q.quotationKind === "studio" && q.studioSnapshot) return q.studioSnapshot;
  return null;
}
