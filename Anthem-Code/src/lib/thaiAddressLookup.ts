import {
  searchAddressByProvince,
  type AddressObject,
} from "thai-address-database";
import { normalizeThaiProvince } from "@/lib/thaiProvinces";

const MAX = 20_000;

export type ThaiAddressRow = {
  /** ตำบล / แขวง */
  subdistrict: string;
  /** อำเภอ / เขต */
  district: string;
  province: string;
  postalCode: string;
};

function toRow(row: AddressObject): ThaiAddressRow {
  return {
    subdistrict: String(row.district ?? ""),
    district: String(row.amphoe ?? ""),
    province: String(row.province ?? ""),
    postalCode: String(row.zipcode ?? "").replace(/\D/g, "").slice(0, 5),
  };
}

function rowsForProvince(provinceRaw: string): ThaiAddressRow[] {
  const province = normalizeThaiProvince(provinceRaw) || provinceRaw.trim();
  if (!province) return [];
  try {
    return (searchAddressByProvince(province, MAX) ?? []).map(toRow);
  } catch {
    return [];
  }
}

/** อำเภอ / เขต ในจังหวัด */
export function listDistrictsForProvince(province: string): string[] {
  const set = new Set<string>();
  for (const r of rowsForProvince(province)) {
    if (r.district) set.add(r.district);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "th"));
}

/** ตำบล / แขวง ในอำเภอ */
export function listSubdistrictsForDistrict(province: string, district: string): string[] {
  const d = district.trim();
  if (!d) return [];
  const set = new Set<string>();
  for (const r of rowsForProvince(province)) {
    if (r.district === d && r.subdistrict) set.add(r.subdistrict);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "th"));
}

/** รหัสไปรษณีย์จากจังหวัด + อำเภอ + ตำบล (อาจมีหลายค่า — คืนรายการไม่ซ้ำ) */
export function listPostalCodes(
  province: string,
  district: string,
  subdistrict: string,
): string[] {
  const d = district.trim();
  const s = subdistrict.trim();
  if (!d || !s) return [];
  const set = new Set<string>();
  for (const r of rowsForProvince(province)) {
    if (r.district === d && r.subdistrict === s && r.postalCode) set.add(r.postalCode);
  }
  return [...set].sort();
}

export function resolvePostalCode(
  province: string,
  district: string,
  subdistrict: string,
): string {
  return listPostalCodes(province, district, subdistrict)[0] ?? "";
}
