import { normalizeThaiProvince } from "@/lib/thaiProvinces";

/**
 * Full Thai-style address on profile (settings / About).
 * Plain code on purpose: this file loads with the feed, so it must not import the schema library.
 * The form schema with the same rules lives in `@/lib/validators`.
 */
export type ProfileAddress = {
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export const PROFILE_ADDRESS_MAX = {
  line1: 120,
  subdistrict: 60,
  district: 60,
  province: 60,
  postalCode: 5,
} as const;

/** Same rules as the form schema: trim, length limits, province normalised, postal code empty or 5 digits. */
export function cleanProfileAddress(
  input: Record<keyof ProfileAddress, string>,
): ProfileAddress | null {
  const line1 = input.line1.trim();
  const subdistrict = input.subdistrict.trim();
  const district = input.district.trim();
  const provinceRaw = input.province.trim();
  const postalCode = input.postalCode.trim();
  if (
    line1.length > PROFILE_ADDRESS_MAX.line1 ||
    subdistrict.length > PROFILE_ADDRESS_MAX.subdistrict ||
    district.length > PROFILE_ADDRESS_MAX.district ||
    provinceRaw.length > PROFILE_ADDRESS_MAX.province ||
    postalCode.length > PROFILE_ADDRESS_MAX.postalCode ||
    !/^(\d{5})?$/.test(postalCode)
  ) {
    return null;
  }
  return {
    line1,
    subdistrict,
    district,
    province: normalizeThaiProvince(provinceRaw) || provinceRaw,
    postalCode,
  };
}

export const EMPTY_PROFILE_ADDRESS: ProfileAddress = {
  line1: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
};

export function parseProfileAddress(raw: unknown): ProfileAddress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_PROFILE_ADDRESS };
  }
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) => {
    if (typeof v === "string") return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return "";
  };
  const postalRaw =
    o.postalCode ?? o.postal_code ?? o.zipcode ?? o.zip_code ?? "";
  const cleaned = cleanProfileAddress({
    line1: str(o.line1),
    subdistrict: str(o.subdistrict ?? o.sub_district ?? o.tambon),
    district: str(o.district ?? o.amphoe),
    province: str(o.province),
    postalCode: str(postalRaw).replace(/\D/g, "").slice(0, 5),
  });
  return cleaned ?? { ...EMPTY_PROFILE_ADDRESS };
}

export function hasProfileAddress(
  addr: ProfileAddress | null | undefined,
): boolean {
  if (!addr) return false;
  return Boolean(
    addr.line1.trim() ||
    addr.subdistrict.trim() ||
    addr.district.trim() ||
    addr.province.trim() ||
    addr.postalCode.trim(),
  );
}

/** Full display line for About / sidebar. */
export function formatProfileAddress(
  addr: ProfileAddress | null | undefined,
): string {
  if (!addr) return "";
  return [
    addr.line1,
    addr.subdistrict,
    addr.district,
    addr.province,
    addr.postalCode,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

/** Short line for cover header chips (district/province). */
export function formatProfileAddressShort(
  addr: ProfileAddress | null | undefined,
): string {
  if (!addr) return "";
  const parts = [addr.district, addr.province]
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  return addr.province.trim() || addr.line1.trim();
}

/** Persist shape (omit empties to keep jsonb lean). */
export function profileAddressToJson(addr: ProfileAddress): ProfileAddress {
  const province = normalizeThaiProvince(addr.province) || addr.province.trim();
  return {
    line1: addr.line1.trim(),
    subdistrict: addr.subdistrict.trim(),
    district: addr.district.trim(),
    province,
    postalCode: addr.postalCode.trim().replace(/\D/g, "").slice(0, 5),
  };
}

/** Prefer structured address; fall back to legacy location string. */
export function displayProfileAddress(
  profileAddress: unknown,
  location?: string | null,
  mode: "full" | "short" = "full",
): string {
  const parsed = parseProfileAddress(profileAddress);
  if (hasProfileAddress(parsed)) {
    return mode === "short"
      ? formatProfileAddressShort(parsed)
      : formatProfileAddress(parsed);
  }
  return (location ?? "").trim();
}

/** Fill province/district dropdowns from a legacy “เขต, จังหวัด” location string. */
export function hydrateAddressFromLocation(
  location: string | null | undefined,
): ProfileAddress {
  const raw = (location ?? "").trim();
  if (!raw) return { ...EMPTY_PROFILE_ADDRESS };
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const provinceRaw = parts[parts.length - 1] ?? "";
    const province = normalizeThaiProvince(provinceRaw) || provinceRaw;
    const district = parts.slice(0, -1).join(" ");
    return { ...EMPTY_PROFILE_ADDRESS, district, province };
  }
  const province = normalizeThaiProvince(raw);
  if (province) return { ...EMPTY_PROFILE_ADDRESS, province };
  return { ...EMPTY_PROFILE_ADDRESS };
}

/** Structured address wins; otherwise hydrate from the legacy location chip. */
export function parseProfileAddressOrLocation(
  profileAddress: unknown,
  location?: string | null,
): ProfileAddress {
  const parsed = parseProfileAddress(profileAddress);
  if (hasProfileAddress(parsed)) return parsed;
  return hydrateAddressFromLocation(location);
}

export type ProfileAddressEditorCopy = {
  title: string;
  hint: string;
  line1: string;
  line1Ph: string;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  selectProvince: string;
  selectDistrict: string;
  selectDistrictFirst: string;
  selectSubdistrict: string;
  selectSubdistrictFirst: string;
  selectPostal: string;
  selectPostalFirst: string;
  unspecified: string;
};

export const PROFILE_ADDRESS_EDITOR_COPY_TH: ProfileAddressEditorCopy = {
  title: "ที่อยู่",
  hint: "เลือกจังหวัด → อำเภอ/เขต → ตำบล/แขวง แล้วระบบใส่รหัสไปรษณีย์ให้",
  line1: "บ้านเลขที่ / หมู่ / ซอย / ถนน",
  line1Ph: "เช่น 123/4 หมู่ 5 ซอยสุขุมวิท 21",
  province: "จังหวัด",
  district: "อำเภอ / เขต",
  subdistrict: "ตำบล / แขวง",
  postalCode: "รหัสไปรษณีย์",
  selectProvince: "เลือกจังหวัด",
  selectDistrict: "เลือกอำเภอ / เขต",
  selectDistrictFirst: "เลือกจังหวัดก่อน",
  selectSubdistrict: "เลือกตำบล / แขวง",
  selectSubdistrictFirst: "เลือกอำเภอ / เขตก่อน",
  selectPostal: "เลือกรหัสไปรษณีย์",
  selectPostalFirst: "เลือกตำบล / แขวงก่อน",
  unspecified: "ไม่ระบุ",
};
