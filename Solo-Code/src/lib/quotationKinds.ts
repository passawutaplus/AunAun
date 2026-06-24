import type { DocumentThemeInput } from "@/lib/documentTheme";
import type { InhouseOrg } from "@/lib/inhouse/types";

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

export interface QuotationCollaborator {
  id: string;
  quotationId: string;
  userId: string | null;
  displayName: string | null;
  role: "lead" | "member";
  revenuePercent: number | null;
  sortOrder: number;
}

export function buildOrgIssuerSnapshot(org: InhouseOrg): IssuerSnapshot {
  return {
    brandName: org.brand_name?.trim() || org.name,
    tagline: org.brand_tagline ?? null,
    logoUrl: org.avatar_url,
    address: org.address ?? null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    taxId: org.tax_id ?? null,
    legalName: org.legal_name ?? null,
    documentTheme: (org.document_theme ?? null) as DocumentThemeInput | null,
  };
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
