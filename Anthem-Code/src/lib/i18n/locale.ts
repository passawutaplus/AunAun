import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  LOCALE_CHANGE_EVENT,
  loadLocalePrefs,
  saveLocalePrefs,
  type AppLocale,
} from "@/lib/localePrefs";

export type { AppLocale };

const ZH_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500&display=swap";

function subscribe(onChange: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const read = (): AppLocale => loadLocalePrefs().locale;

/** The reader's interface language (th / en / zh), shared by every component and kept in sync. */
export function useAppLocale() {
  const locale = useSyncExternalStore(subscribe, read, () => "en" as AppLocale);

  const setLocale = useCallback((next: AppLocale) => {
    saveLocalePrefs({ ...loadLocalePrefs(), locale: next });
  }, []);

  // Chinese glyphs are heavy: fetch them only for readers who pick the language.
  useEffect(() => {
    if (locale !== "zh" || document.querySelector("link[data-app-zh]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ZH_FONT_HREF;
    link.dataset.appZh = "";
    document.head.append(link);
  }, [locale]);

  return { locale, setLocale };
}

const DATE_LOCALE: Record<AppLocale, string> = {
  th: "th-TH-u-ca-buddhist",
  en: "en-GB",
  zh: "zh-CN",
};

/** "13 ก.ค. 2569" / "13 Jul 2026" / "2026年7月13日". */
export function formatLocaleDate(iso: string | null | undefined, locale: AppLocale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short", year: "numeric" });
}

/** Short counts: 1.2k (th/en), 1.2万 (zh). */
export function formatLocaleCount(n: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
