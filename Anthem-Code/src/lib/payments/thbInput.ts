/** Digit-only THB major units with thousands separators for amount inputs. */

export function digitsFromThbInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}

export function formatThbGrouped(digits: string): string {
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US");
}

export function parseThbGroupedToNumber(raw: string): number {
  const digits = digitsFromThbInput(raw);
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}
