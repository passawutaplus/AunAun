export type AppLocale = "th" | "en" | "zh";

export type LocalePrefs = {
  locale: AppLocale;
  timezone: string;
};

const KEY = "aplus1:locale-prefs";

const DEFAULT: LocalePrefs = {
  locale: "th",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
};

export const APP_LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

/** Fired on window after the locale is saved, so open views can re-render. */
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
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<LocalePrefs>;
    return {
      locale: parsed.locale === "en" || parsed.locale === "zh" ? parsed.locale : "th",
      timezone: parsed.timezone?.trim() || DEFAULT.timezone,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveLocalePrefs(prefs: LocalePrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}
