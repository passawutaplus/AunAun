import type { DisplayCurrency, FxSnapshot } from "./types";

export type FxRateRow = {
  quoteCurrency: DisplayCurrency;
  rate: number;
  source: string;
  asOf: string;
};

/** Convert THB major units using quote-per-THB rate (e.g. USD per 1 THB). */
export function convertThbMajor(thb: number, rate: number): number {
  if (!Number.isFinite(thb) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("invalid FX inputs");
  }
  return thb * rate;
}

export function convertSatangToQuote(satang: number, rate: number): number {
  return convertThbMajor(satang / 100, rate);
}

export function formatMoneyLabel(
  amountMajor: number,
  currency: DisplayCurrency,
  locale = "th-TH",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "THB" ? 0 : 2,
  }).format(amountMajor);
}

export function snapshotFxRate(row: FxRateRow): FxSnapshot {
  return {
    quoteCurrency: row.quoteCurrency,
    rate: row.rate,
    source: row.source,
    asOf: row.asOf,
  };
}

export type CheckoutDisplayAmounts = {
  payableThbMajor: number;
  payableLabel: string;
  quoteCurrency?: DisplayCurrency;
  quoteMajor?: number;
  quoteLabel?: string;
};

export function buildCheckoutDisplay(input: {
  buyerPaysSatang: number;
  displayCurrency: DisplayCurrency;
  fx?: FxRateRow | null;
}): CheckoutDisplayAmounts {
  const payableThbMajor = input.buyerPaysSatang / 100;
  const payableLabel = formatMoneyLabel(payableThbMajor, "THB");
  if (input.displayCurrency === "THB" || !input.fx) {
    return { payableThbMajor, payableLabel };
  }
  const quoteMajor = convertSatangToQuote(input.buyerPaysSatang, input.fx.rate);
  return {
    payableThbMajor,
    payableLabel,
    quoteCurrency: input.displayCurrency,
    quoteMajor,
    quoteLabel: formatMoneyLabel(quoteMajor, input.displayCurrency),
  };
}

const PREF_KEY = "aplus1_display_currency";

export function readDisplayCurrencyPreference(
  fallback: DisplayCurrency = "THB",
): DisplayCurrency {
  if (typeof localStorage === "undefined") return fallback;
  const v = localStorage.getItem(PREF_KEY);
  return v === "USD" || v === "THB" ? v : fallback;
}

export function writeDisplayCurrencyPreference(currency: DisplayCurrency): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PREF_KEY, currency);
}
