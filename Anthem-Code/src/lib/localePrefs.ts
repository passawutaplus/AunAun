export type AppLocale = "th" | "en" | "zh";

export type LocalePrefs = {
  locale: AppLocale;
  timezone: string;
};

const KEY = "aplus1:locale-prefs";

/** The landing page's own language pick; reused so a visitor's first choice carries into the app. */
const LANDING_KEY = "samecor-landing-lang";

const isLocale = (v: unknown): v is AppLocale => v === "th" || v === "en" || v === "zh";

/** New visitors start in English (owner decision 2026-11-04), unless they already picked one on the landing page. */
function firstLocale(): AppLocale {
  try {
    const landing = window.localStorage.getItem(LANDING_KEY);
    if (isLocale(landing)) return landing;
  } catch {
    /* private mode */
  }
  return "en";
}

const DEFAULT: LocalePrefs = {
  locale: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
};

export const APP_LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

/** Fired on this tab whenever the saved locale changes (the `storage` event only reaches other tabs). */
export const LOCALE_CHANGE_EVENT = "samecor:locale-change";

export function detectTimezones(): string[] {
  const common = [
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Shanghai",
    "UTC",
    "Europe/London",
    "America/Los_Angeles",
    "America/New_York",
  ];
  // Intl.supportedValuesOf is ES2022; not in every runtime (or in our TS lib target).
  const intl = (typeof Intl !== "undefined" ? Intl : undefined) as
    | { supportedValuesOf?: (key: "timeZone") => string[] }
    | undefined;
  const supported = intl?.supportedValuesOf?.("timeZone") ?? common;
  const set = new Set([...common, ...supported]);
  return Array.from(set);
}

export function loadLocalePrefs(): LocalePrefs {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, locale: firstLocale() };
    const parsed = JSON.parse(raw) as Partial<LocalePrefs>;
    return {
      locale: isLocale(parsed.locale) ? parsed.locale : firstLocale(),
      timezone: parsed.timezone?.trim() || DEFAULT.timezone,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveLocalePrefs(prefs: LocalePrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  try {
    window.localStorage.setItem(LANDING_KEY, prefs.locale);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}
