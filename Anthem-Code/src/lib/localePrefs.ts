export type AppLocale = "th" | "en";

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
];

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
  const supported =
    typeof Intl !== "undefined" && "supportedValuesOf" in Intl
      ? (Intl.supportedValuesOf("timeZone") as string[])
      : common;
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
      locale: parsed.locale === "en" ? "en" : "th",
      timezone: parsed.timezone?.trim() || DEFAULT.timezone,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveLocalePrefs(prefs: LocalePrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
}
