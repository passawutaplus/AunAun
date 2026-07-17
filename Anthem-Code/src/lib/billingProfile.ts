import type { OfferPartyInfo, OfferPartyType } from "@/lib/chatOffer";

/** Billing fields stored on profiles (see aplus1-hire-flow-docs.sql). */
export type BillingProfileFields = {
  billing_type?: string | null;
  legal_name?: string | null;
  company_name?: string | null;
  tax_id?: string | null;
  billing_address?: string | null;
  branch?: string | null;
  contact_person?: string | null;
  contact_role?: string | null;
  vat_registered?: boolean | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function billingToParty(p: BillingProfileFields | null | undefined): OfferPartyInfo {
  const type: OfferPartyType = p?.billing_type === "corporate" ? "corporate" : "individual";
  return {
    type,
    name: (p?.legal_name || p?.display_name || "").trim() || null,
    companyName: (p?.company_name || "").trim() || null,
    taxId: (p?.tax_id || "").replace(/\D/g, "").slice(0, 13) || null,
    address: (p?.billing_address || "").trim() || null,
    phone: (p?.phone || "").trim() || null,
    email: (p?.email || "").trim() || null,
    branch: (p?.branch || "").trim() || null,
    contactPerson: (p?.contact_person || "").trim() || null,
    contactRole: (p?.contact_role || "").trim() || null,
    vatRegistered: !!p?.vat_registered,
  };
}

export function partyToBillingPatch(party: OfferPartyInfo): Record<string, unknown> {
  return {
    billing_type: party.type,
    legal_name: party.name,
    company_name: party.companyName,
    tax_id: party.taxId,
    billing_address: party.address,
    branch: party.branch,
    contact_person: party.contactPerson,
    contact_role: party.contactRole,
    vat_registered: !!party.vatRegistered,
  };
}
