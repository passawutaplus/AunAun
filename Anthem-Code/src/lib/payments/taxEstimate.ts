/** Pure tax estimate helpers for freelancer earnings (THB). Disclaimer: approximate only. */

export const PERSONAL_ALLOWANCE_THB = 60_000;
export const STANDARD_EXPENSE_CAP_THB = 100_000;
export const STANDARD_EXPENSE_RATE = 0.5;

/** Progressive PIT brackets (assessment year — illustrative). */
export const PIT_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

export function sumWhtWithheld(items: { whtThb: number }[]): number {
  return items.reduce((s, i) => s + Math.max(0, i.whtThb || 0), 0);
}

export function estimateDeductibleExpense(grossIncomeThb: number): number {
  const half = grossIncomeThb * STANDARD_EXPENSE_RATE;
  return Math.min(STANDARD_EXPENSE_CAP_THB, Math.max(0, half));
}

export function taxOnTaxableIncome(taxableThb: number): number {
  if (taxableThb <= 0) return 0;
  let remaining = taxableThb;
  let prev = 0;
  let tax = 0;
  for (const b of PIT_BRACKETS) {
    const span = Math.min(remaining, b.upTo - prev);
    if (span <= 0) break;
    tax += span * b.rate;
    remaining -= span;
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

export type TaxEstimateInput = {
  /** Gross hire income in THB for the tax year (before platform fee). */
  grossIncomeThb: number;
  /** WHT already withheld by corporate clients. */
  whtWithheldThb?: number;
  /** Extra deductions beyond standard expense + personal allowance. */
  extraDeductionsThb?: number;
};

export type TaxEstimateResult = {
  grossIncomeThb: number;
  expenseThb: number;
  personalAllowanceThb: number;
  taxableThb: number;
  estimatedTaxThb: number;
  whtWithheldThb: number;
  /** Positive = still owe; negative = credit/refund estimate. */
  netTaxDueThb: number;
};

export function estimatePersonalIncomeTax(input: TaxEstimateInput): TaxEstimateResult {
  const gross = Math.max(0, input.grossIncomeThb || 0);
  const expenseThb = estimateDeductibleExpense(gross);
  const personalAllowanceThb = PERSONAL_ALLOWANCE_THB;
  const extra = Math.max(0, input.extraDeductionsThb || 0);
  const taxableThb = Math.max(0, gross - expenseThb - personalAllowanceThb - extra);
  const estimatedTaxThb = taxOnTaxableIncome(taxableThb);
  const whtWithheldThb = Math.max(0, input.whtWithheldThb || 0);
  return {
    grossIncomeThb: gross,
    expenseThb,
    personalAllowanceThb,
    taxableThb,
    estimatedTaxThb,
    whtWithheldThb,
    netTaxDueThb: estimatedTaxThb - whtWithheldThb,
  };
}
