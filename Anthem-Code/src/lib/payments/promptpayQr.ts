/**
 * Thai PromptPay QR (EMVCo merchant-presented) payload — the freelancer's own PromptPay,
 * so the client pays them directly. SAMECOR never receives the money.
 */

export type PromptPayIdKind = "phone" | "national_id" | "ewallet";

/** Digits only; returns null when the id is not a valid PromptPay target. */
export function normalizePromptPayId(
  raw: string | null | undefined,
): { id: string; kind: PromptPayIdKind } | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return { id: digits, kind: "phone" };
  if (/^66\d{9}$/.test(digits))
    return { id: `0${digits.slice(2)}`, kind: "phone" };
  if (/^\d{13}$/.test(digits)) return { id: digits, kind: "national_id" };
  if (/^\d{15}$/.test(digits)) return { id: digits, kind: "ewallet" };
  return null;
}

/** "081-xxx-5678" / "1-xxxx-xxxxx-12-3" style masking for printed documents. */
export function maskPromptPayId(raw: string): string {
  const n = normalizePromptPayId(raw);
  if (!n) return raw;
  if (n.kind === "phone") return `${n.id.slice(0, 3)}-xxx-${n.id.slice(6)}`;
  return `${n.id.slice(0, 1)}-xxxx-xxxxx-${n.id.slice(-3, -1)}-${n.id.slice(-1)}`;
}

function tlv(tag: string, value: string) {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Build the QR string. `amount` in THB (omit for an open-amount QR). */
export function promptPayPayload(
  rawId: string,
  amount?: number | null,
): string | null {
  const n = normalizePromptPayId(rawId);
  if (!n) return null;
  const target =
    n.kind === "phone"
      ? tlv("01", `0066${n.id.slice(1)}`.padStart(13, "0"))
      : n.kind === "national_id"
        ? tlv("02", n.id)
        : tlv("03", n.id);
  const merchant = tlv("29", tlv("00", "A000000677010111") + target);
  const hasAmount =
    typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  let payload =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") +
    merchant +
    tlv("58", "TH") +
    tlv("53", "764") +
    (hasAmount ? tlv("54", amount!.toFixed(2)) : "");
  payload += "6304";
  return payload + crc16(payload);
}
