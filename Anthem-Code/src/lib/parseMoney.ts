/** Parse Thai/currency text like "50,000" → 50000. Returns null if empty/invalid. */
export function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
