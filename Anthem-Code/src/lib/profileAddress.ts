import { z } from "zod";

/** Full Thai-style address on profile (settings / About). */
export const profileAddressSchema = z.object({
  line1: z.string().trim().max(120).default(""),
  subdistrict: z.string().trim().max(60).default(""),
  district: z.string().trim().max(60).default(""),
  province: z.string().trim().max(60).default(""),
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
  const postal =
    typeof o.postalCode === "string"
      ? o.postalCode
      : typeof o.postal_code === "string"
        ? o.postal_code
        : "";
  const parsed = profileAddressSchema.safeParse({
    line1: typeof o.line1 === "string" ? o.line1 : "",
    subdistrict: typeof o.subdistrict === "string" ? o.subdistrict : "",
    district: typeof o.district === "string" ? o.district : "",
    province: typeof o.province === "string" ? o.province : "",
    postalCode: postal.replace(/\D/g, "").slice(0, 5),
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
  return {
    line1: addr.line1.trim(),
    subdistrict: addr.subdistrict.trim(),
    district: addr.district.trim(),
    province: addr.province.trim(),
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
