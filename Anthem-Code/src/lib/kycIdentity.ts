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
