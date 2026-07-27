/** Thai national ID checksum (13 digits). */
export function isValidThaiNationalId(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]!, 10) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(digits[12]!, 10);
}

export function formatThaiNationalId(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 1) return d;
  if (d.length <= 5) return `${d[0]}-${d.slice(1)}`;
  if (d.length <= 10) return `${d[0]}-${d.slice(1, 5)}-${d.slice(5)}`;
  if (d.length <= 12) return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10)}`;
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
}

export function maskThaiNationalId(value: string | null | undefined): string {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length < 4) return "·············";
  return `* **** ***** ** ${d.slice(-1)}`;
}

/** Thai ID back laser code — e.g. JT0-1234567-89 */
export function formatThaiIdLaserCode(value: string): string {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (raw.length <= 3) return raw;
  if (raw.length <= 10) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 10)}-${raw.slice(10)}`;
}

export function isValidThaiIdLaserCode(value: string): boolean {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2}\d{10}$/.test(raw);
}

export function maskThaiIdLaserCode(value: string | null | undefined): string {
  const raw = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length < 4) return "···-·······-··";
  return `${raw.slice(0, 2)}•-•••••••-${raw.slice(-2)}`;
}

/** Thai mobile: 9–10 digits starting with 0. */
export function isValidThaiPhone(value: string): boolean {
  const d = value.replace(/\D/g, "");
  return /^0\d{8,9}$/.test(d);
}

export function ageFromDateOfBirth(isoDate: string, asOf = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const birth = new Date(y!, m! - 1, d!);
  if (Number.isNaN(birth.getTime())) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const md = asOf.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && asOf.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function isAdultDateOfBirth(isoDate: string, minAge = 18): boolean {
  const age = ageFromDateOfBirth(isoDate);
  return age != null && age >= minAge && age < 120;
}

/** KYC re-verification window after approval (years). */
export const KYC_VALIDITY_YEARS = 2;

export function kycExpiryDate(from = new Date(), years = KYC_VALIDITY_YEARS): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function isKycExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}

/** Prefer DB `kyc_expires_at`; else reviewed_at + KYC_VALIDITY_YEARS (pre-migration). */
export function resolveKycExpiresAt(opts: {
  kyc_expires_at?: string | null;
  reviewed_at?: string | null;
}): string | null {
  if (opts.kyc_expires_at) return opts.kyc_expires_at;
  if (!opts.reviewed_at) return null;
  const d = new Date(opts.reviewed_at);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + KYC_VALIDITY_YEARS);
  return d.toISOString();
}

export type KycAddress = {
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export function formatKycAddress(addr: KycAddress | Record<string, string> | null | undefined): string {
  if (!addr) return "—";
  const a = addr as Record<string, string>;
  const parts = [
    a.line1,
    a.subdistrict,
    a.district,
    a.province,
    a.postalCode ?? a.postal_code,
  ].filter(Boolean);
  return parts.join(" ") || "—";
}

export const KYC_CONFIRM_PHRASE = "CONFIRM";

/** PEP disclosure for KYC / EDD — not a hard reject. */
export type KycPepStatus = "none" | "yes";

/** Sanctions disclosure — not a hard reject; triggers EDD when not none. */
export type KycSanctionsStatus = "none" | "listed";

export type KycPepEddFields = {
  position: string;
  organization: string;
  leftAt: string;
  relationship: string;
};

export type KycSanctionsEddFields = {
  detail: string;
  listName: string;
  country: string;
};

export const KYC_PEP_STATUS_LABELS: Record<KycPepStatus, string> = {
  none: "ไม่ได้เป็นบุคคลที่มีสถานภาพทางการเมือง",
  yes: "เป็นบุคคล หรือ สมาชิกครอบครัว หรือ ผู้ใกล้ชิดของบุคคลที่มีสถานภาพทางการเมือง",
};

export const KYC_SANCTIONS_STATUS_LABELS: Record<KycSanctionsStatus, string> = {
  none: "ไม่ใช่",
  listed: "อยู่ในหรือเกี่ยวข้องกับบัญชีคว่ำบาตร",
};

export function needsPepEdd(status: KycPepStatus | ""): boolean {
  return status === "yes";
}

export function needsSanctionsEdd(status: KycSanctionsStatus | ""): boolean {
  return status === "listed";
}

export const KYC_EDD_NOTICE =
  "คุณยังสามารถใช้งาน Aplus1 ได้ อย่างไรก็ตาม ระบบอาจต้องขอข้อมูลเพิ่มเติมและใช้เวลาตรวจสอบนานกว่าปกติ";

export const KYC_DOC_QUALITY_CHECKS = [
  "เอกสารชัด อ่านตัวอักษรได้ ไม่เบลอ",
  "แสงพอ ไม่มีสะท้อนบังข้อมูลสำคัญ",
  "เอกสารทั้งใบอยู่ในกรอบ ไม่ตัดมุม",
] as const;

export const KYC_SELFIE_GUIDANCE = [
  "วางใบหน้าให้อยู่กลางเฟรม",
  "แสงพอ ใบหน้าชัด ไม่เบลอ",
  "มีแค่คุณคนเดียวในเฟรม",
] as const;
