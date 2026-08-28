import { thaiPhoneRegex } from "@/lib/validators";

/** Strip spaces/dashes; keep a leading +. */
export function normalizeInboxPhone(raw: string): string {
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+66") && s[3] === "0") s = `0${s.slice(4)}`;
  else if (s.startsWith("66") && s.length === 11) s = `+${s}`;
  return s;
}

export function parseInboxPhone(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: true, value: null };
  const value = normalizeInboxPhone(raw);
  if (!thaiPhoneRegex.test(value)) {
    return { ok: false, error: "เบอร์โทรไทยไม่ถูกต้อง" };
  }
  return { ok: true, value };
}
