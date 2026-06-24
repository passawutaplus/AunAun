/** Stripe card processing — gross-up so freelancer receives full job amount. */
const CARD_RATE = 0.0365;
const CARD_FIXED_THB = 10;

export type ClientPaymentEstimate = {
  jobAmount: number;
  feeAmount: number;
  totalAmount: number;
};

export function estimateClientPaymentCheckout(jobAmountThb: number): ClientPaymentEstimate {
  const jobAmount = Math.max(1, Math.round(jobAmountThb));
  const feeAmount = Math.ceil((jobAmount * CARD_RATE + CARD_FIXED_THB) / (1 - CARD_RATE));
  return { jobAmount, feeAmount, totalAmount: jobAmount + feeAmount };
}

/** Stripe THB amounts are in satang (×100). */
export function thbToStripeCents(amountThb: number): number {
  return Math.max(100, Math.round(amountThb * 100));
}
