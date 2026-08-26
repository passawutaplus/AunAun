import type { KycAddress } from "@/lib/kycIdentity";
import type { KycDocType } from "@/lib/kycUpload";
import {
  KYC_REJECT_REASONS,
  type KycRejectReasonCode,
} from "@/lib/kycRejectReasons";

export type KycClearKey =
  | "givenName"
  | "familyName"
  | "nationalId"
  | "idFront"
  | "selfie"
  | "bankName"
  | "accountNumber"
  | "accountName"
  | "bankBook";

const CLEAR_BY_REASON: Record<KycRejectReasonCode, KycClearKey[]> = {
  blurry_id: ["idFront"],
  blurry_selfie: ["selfie"],
  blurry_bank_book: ["bankBook"],
  name_mismatch: ["givenName", "familyName"],
  id_number_mismatch: ["nationalId"],
  bank_name_mismatch: ["accountName"],
  invalid_bank_account: ["accountNumber"],
  duplicate_bank: ["bankName", "accountNumber", "accountName", "bankBook"],
  incomplete_docs: [],
  suspected_fraud: [],
  other: [],
};

const ALLOWED = new Set<string>(KYC_REJECT_REASONS.map((r) => r.code));

export function isKycRejectReasonCode(value: string): value is KycRejectReasonCode {
  return ALLOWED.has(value);
}

export function parseKycRejectCodes(input: {
  reject_reason_code?: string | null;
  reject_reason_codes?: string[] | null;
  submission_meta?: Record<string, unknown> | null;
}): KycRejectReasonCode[] {
  const meta = input.submission_meta ?? {};
  const fromMeta = Array.isArray(meta.reject_reason_codes)
    ? meta.reject_reason_codes.filter((x): x is string => typeof x === "string")
    : [];
  const fromCol = Array.isArray(input.reject_reason_codes) ? input.reject_reason_codes : [];
  const raw =
    fromCol.length > 0
      ? fromCol
      : fromMeta.length > 0
        ? fromMeta
        : input.reject_reason_code
          ? [input.reject_reason_code]
          : [];
  const seen = new Set<KycRejectReasonCode>();
  const out: KycRejectReasonCode[] = [];
  for (const code of raw) {
    if (!isKycRejectReasonCode(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export function joinKycRejectLabels(codes: KycRejectReasonCode[]): string {
  return codes
    .map((c) => KYC_REJECT_REASONS.find((r) => r.code === c)?.label ?? c)
    .join(" · ");
}

export function kycClearKeysForReasons(codes: KycRejectReasonCode[]): Set<KycClearKey> {
  const keys = new Set<KycClearKey>();
  for (const code of codes) {
    for (const k of CLEAR_BY_REASON[code] ?? []) keys.add(k);
  }
  return keys;
}

export function splitLegalName(
  legalName: string,
  meta?: Record<string, unknown> | null,
): { given: string; family: string } {
  const given = typeof meta?.given_name === "string" ? meta.given_name.trim() : "";
  const family = typeof meta?.family_name === "string" ? meta.family_name.trim() : "";
  if (given || family) return { given, family };
  const parts = legalName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { given: parts[0] ?? "", family: "" };
  return { given: parts[0]!, family: parts.slice(1).join(" ") };
}

export function addressFromKycJson(
  addr: Record<string, string> | null | undefined,
): KycAddress {
  if (!addr) {
    return { line1: "", subdistrict: "", district: "", province: "", postalCode: "" };
  }
  return {
    line1: addr.line1 ?? "",
    subdistrict: addr.subdistrict ?? "",
    district: addr.district ?? "",
    province: addr.province ?? "",
    postalCode: addr.postalCode ?? addr.postal_code ?? "",
  };
}

export type KycResubmitPrefill = {
  givenName: string;
  familyName: string;
  nationalId: string;
  dateOfBirth: string;
  phone: string;
  contactEmail: string;
  lineId: string;
  idExpiry: string;
  address: KycAddress;
  bankName: string;
  accountNumber: string;
  accountName: string;
  docs: Partial<Record<KycDocType, string>>;
  cleared: Set<KycClearKey>;
  reasonCodes: KycRejectReasonCode[];
  reasonLabel: string;
};

export function buildKycResubmitPrefill(input: {
  legal_name?: string | null;
  national_id_number?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  address_json?: Record<string, string> | null;
  reject_reason_code?: string | null;
  reject_reason_codes?: string[] | null;
  reject_reason_label?: string | null;
  submission_meta?: Record<string, unknown> | null;
  documents: { doc_type: string; storage_path: string }[];
}): KycResubmitPrefill {
  const reasonCodes = parseKycRejectCodes(input);
  const cleared = kycClearKeysForReasons(reasonCodes);
  const names = splitLegalName(input.legal_name ?? "", input.submission_meta);
  const lineId =
    typeof input.submission_meta?.line_id === "string" ? input.submission_meta.line_id.trim() : "";
  const idExpiryRaw =
    typeof input.submission_meta?.id_expiry === "string" ? input.submission_meta.id_expiry : "";
  const dob = (input.date_of_birth ?? "").slice(0, 10);

  const docs: Partial<Record<KycDocType, string>> = {};
  for (const d of input.documents) {
    const type = d.doc_type as KycDocType;
    if (type === "id_front" && cleared.has("idFront")) continue;
    if (type === "selfie" && cleared.has("selfie")) continue;
    if (type === "bank_book" && cleared.has("bankBook")) continue;
    if (type !== "id_front" && type !== "selfie" && type !== "bank_book") continue;
    if (d.storage_path) docs[type] = d.storage_path;
  }

  return {
    givenName: cleared.has("givenName") ? "" : names.given,
    familyName: cleared.has("familyName") ? "" : names.family,
    nationalId: cleared.has("nationalId") ? "" : (input.national_id_number ?? "").replace(/\D/g, ""),
    dateOfBirth: dob,
    phone: input.phone ?? "",
    contactEmail: input.contact_email ?? "",
    lineId,
    idExpiry: idExpiryRaw.slice(0, 10),
    address: addressFromKycJson(input.address_json),
    bankName: cleared.has("bankName") ? "" : (input.bank_name ?? ""),
    accountNumber: cleared.has("accountNumber") ? "" : (input.account_number ?? ""),
    accountName: cleared.has("accountName") ? "" : (input.account_name ?? ""),
    docs,
    cleared,
    reasonCodes,
    reasonLabel:
      (input.reject_reason_label ?? "").trim() || joinKycRejectLabels(reasonCodes),
  };
}
