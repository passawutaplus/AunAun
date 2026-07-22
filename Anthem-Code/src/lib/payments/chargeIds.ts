/** Client-facing merchant reference for hire charges (mock + API). */
export function makeHireReference(): string {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `AP${rand.slice(0, 14).padEnd(14, "0")}`;
}

/**
 * Live Omise charges (`chrg_*`) must be confirmed by webhook/service role only.
 * Mock / local ids may call `confirm_hire_order_payment` from the buyer session.
 */
export function canClientConfirmHireCharge(chargeId: string): boolean {
  if (!chargeId) return false;
  if (chargeId.startsWith("chrg_")) return false;
  return chargeId.startsWith("mock_") || chargeId.length > 0;
}
