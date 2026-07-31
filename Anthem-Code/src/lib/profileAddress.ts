import { z } from "zod";
import { normalizeThaiProvince } from "@/lib/thaiProvinces";

/** Full Thai-style address on profile (settings / About). */
export const profileAddressSchema = z.object({
  line1: z.string().trim().max(120).default(""),
  subdistrict: z.string().trim().max(60).default(""),
  district: z.string().trim().max(60).default(""),
  province: z
    .string()
    .trim()
    .max(60)
    .transform((v) => normalizeThaiProvince(v) || v.trim())
    .default(""),
  postalCode: z
    .string()
    .trim()
    .max(5)
    .regex(/^(\d{5})?$/, "รหัสไปรษณีย์ 5 หลัก")
    .default(""),
});

export type ProfileAddress = z.infer<typeof profileAddressSchema>;

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
  const parsed = profileAddressSchema.safeParse({
    line1: str(o.line1),
    subdistrict: str(o.subdistrict ?? o.sub_district ?? o.tambon),
    district: str(o.district ?? o.amphoe),
    province: str(o.province),
    postalCode: str(postalRaw).replace(/\D/g, "").slice(0, 5),
  });
  return parsed.success ? parsed.data : { ...EMPTY_PROFILE_ADDRESS };
}

export function hasProfileAddress(addr: ProfileAddress | null | undefined): boolean {
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
export function formatProfileAddress(addr: ProfileAddress | null | undefined): string {
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
export function formatProfileAddressShort(addr: ProfileAddress | null | undefined): string {
  if (!addr) return "";
  const parts = [addr.district, addr.province].map((s) => s.trim()).filter(Boolean);
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
    return mode === "short" ? formatProfileAddressShort(parsed) : formatProfileAddress(parsed);
  }
  return (location ?? "").trim();
}
