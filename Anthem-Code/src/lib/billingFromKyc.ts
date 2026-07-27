import type { BillingProfileFields } from "@/lib/billingProfile";
import { formatKycAddress, type KycAddress } from "@/lib/kycIdentity";

/** Minimal KYC slice needed to fill billing / tax docs. */
export type KycBillingSource = {
  status?: string | null;
  legal_name?: string | null;
  national_id_number?: string | null;
  address_json?: Record<string, string> | null;
  phone?: string | null;
  contact_email?: string | null;
  kyc_expires_at?: string | null;
  reviewed_at?: string | null;
};

export function formatKycAddressJson(
  raw: Record<string, string> | null | undefined,
): string {
  if (!raw) return "";
  const addr: KycAddress = {
    line1: raw.line1 || "",
    subdistrict: raw.subdistrict || "",
    district: raw.district || "",
    province: raw.province || "",
    postalCode: raw.postalCode || raw.postal_code || "",
  };
  const formatted = formatKycAddress(addr);
  return formatted === "—" ? "" : formatted;
}

export function kycAddressToProfileAddress(
  raw: Record<string, string> | null | undefined,
): {
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
} {
  if (!raw) {
    return { line1: "", subdistrict: "", district: "", province: "", postalCode: "" };
  }
  return {
    line1: (raw.line1 || "").trim(),
    subdistrict: (raw.subdistrict || "").trim(),
    district: (raw.district || "").trim(),
    province: (raw.province || "").trim(),
    postalCode: ((raw.postalCode || raw.postal_code || "").replace(/\D/g, "").slice(0, 5)),
  };
}

/** Overlay approved KYC onto profile billing — KYC wins for individual identity fields. */
export function mergeBillingWithKyc(
  profile: BillingProfileFields | null | undefined,
  kyc: KycBillingSource | null | undefined,
): BillingProfileFields {
  const base: BillingProfileFields = { ...(profile ?? {}) };
  if (!kyc || kyc.status !== "approved") return base;

  const address = formatKycAddressJson(kyc.address_json);
  const legalName = (kyc.legal_name || "").trim();
  const taxId = (kyc.national_id_number || "").replace(/\D/g, "").slice(0, 13);

  return {
    ...base,
    legal_name: legalName || base.legal_name || null,
    tax_id: taxId || base.tax_id || null,
    billing_address: address || base.billing_address || null,
    phone: (kyc.phone || "").trim() || base.phone || null,
    email: (kyc.contact_email || "").trim() || base.email || null,
  };
}

export function hasApprovedKycBilling(kyc: KycBillingSource | null | undefined): boolean {
  return kyc?.status === "approved";
}
