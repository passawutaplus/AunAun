/** Daily FX rates for display-only conversion (settlement stays THB). */

export const PORTFOLIO_FX_CURRENCIES = [
  "THB",
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "JPY",
  "MYR",
  "CNY",
] as const;

export type PortfolioFxCurrency = (typeof PORTFOLIO_FX_CURRENCIES)[number];

export type DailyFxBundle = {
  /** YYYY-MM-DD in Asia/Bangkok */
  asOf: string;
  /** Units of quote currency per 1 THB */
  rates: Partial<Record<PortfolioFxCurrency, number>>;
  source: string;
  fetchedAt: string;
};

const CACHE_KEY = "aplus1_fx_daily_v1";
const PREF_KEY = "aplus1_portfolio_fx_currency";

const FALLBACK_RATES: DailyFxBundle = {
  asOf: "fallback",
  rates: {
    THB: 1,
    USD: 0.0285,
    EUR: 0.0265,
    GBP: 0.0225,
    SGD: 0.0385,
    JPY: 4.35,
    MYR: 0.135,
    CNY: 0.205,
  },
  source: "fallback",
  fetchedAt: new Date(0).toISOString(),
};

export function bangkokDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isPortfolioFxCurrency(v: string | null | undefined): v is PortfolioFxCurrency {
  return !!v && (PORTFOLIO_FX_CURRENCIES as readonly string[]).includes(v);
}

export function readPortfolioFxCurrency(fallback: PortfolioFxCurrency = "THB"): PortfolioFxCurrency {
  if (typeof localStorage === "undefined") return fallback;
  const v = localStorage.getItem(PREF_KEY);
  return isPortfolioFxCurrency(v) ? v : fallback;
}

export function writePortfolioFxCurrency(currency: PortfolioFxCurrency): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PREF_KEY, currency);
}

export function readCachedDailyFx(): DailyFxBundle | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyFxBundle;
    if (!parsed?.asOf || !parsed?.rates || typeof parsed.rates !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedDailyFx(bundle: DailyFxBundle): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore quota */
  }
}

export function currencySymbol(c: PortfolioFxCurrency): string {
  switch (c) {
    case "THB":
      return "฿";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "SGD":
      return "S$";
    case "JPY":
      return "¥";
    case "MYR":
      return "RM";
    case "CNY":
      return "¥";
    default:
      return c;
  }
}

export function formatPortfolioMoney(amount: number, currency: PortfolioFxCurrency): string {
  if (!Number.isFinite(amount)) return "—";
  const zeroDecimals = currency === "THB" || currency === "JPY";
  return new Intl.NumberFormat(currency === "THB" ? "th-TH" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
  }).format(amount);
}

/** Convert THB major → display currency using quote-per-THB rate. */
export function convertThbToFx(
  thb: number,
  currency: PortfolioFxCurrency,
  rates: Partial<Record<PortfolioFxCurrency, number>> | null | undefined,
): number {
  if (!Number.isFinite(thb)) return 0;
  if (currency === "THB") return thb;
  const rate = rates?.[currency];
  if (!rate || rate <= 0) return thb;
  return thb * rate;
}

/** Convert display currency → THB major. */
export function convertFxToThb(
  amount: number,
  currency: PortfolioFxCurrency,
  rates: Partial<Record<PortfolioFxCurrency, number>> | null | undefined,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === "THB") return amount;
  const rate = rates?.[currency];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

async function fetchFrankfurterRates(): Promise<DailyFxBundle> {
  const quotes = PORTFOLIO_FX_CURRENCIES.filter((c) => c !== "THB").join(",");
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=THB&to=${encodeURIComponent(quotes)}`,
  );
  if (!res.ok) throw new Error(`fx_http_${res.status}`);
  const data = (await res.json()) as {
    date?: string;
    rates?: Record<string, number>;
  };
  const rates: Partial<Record<PortfolioFxCurrency, number>> = { THB: 1 };
  for (const c of PORTFOLIO_FX_CURRENCIES) {
    if (c === "THB") continue;
    const r = data.rates?.[c];
    if (typeof r === "number" && r > 0) rates[c] = r;
  }
  return {
    asOf: data.date || bangkokDateKey(),
    rates,
    source: "frankfurter.app",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Return today's FX bundle (Bangkok day). Uses cache when fresh; otherwise fetches
 * Frankfurter (ECB) and falls back to last cache / static rates.
 */
export async function getDailyFxRates(): Promise<DailyFxBundle> {
  const today = bangkokDateKey();
  const cached = readCachedDailyFx();
  if (cached && cached.asOf === today && cached.source !== "fallback") {
    return cached;
  }

  try {
    const fresh = await fetchFrankfurterRates();
    writeCachedDailyFx(fresh);
    return fresh;
  } catch {
    if (cached) return cached;
    return { ...FALLBACK_RATES, asOf: today, fetchedAt: new Date().toISOString() };
  }
}
