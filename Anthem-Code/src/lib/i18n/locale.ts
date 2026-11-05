/**
 * Thin aliases over the one language store in ./index.ts, kept so existing imports keep working.
 * New code: use `useLang` / `setLang` / `useT` from "@/lib/i18n".
 */
import { formatCount, formatShortDate, setLang, useLang } from "./index";
import type { AppLocale } from "@/lib/localePrefs";

export type { AppLocale };

/** The reader's interface language (th / en / zh), shared by every component and kept in sync. */
export function useAppLocale() {
  return { locale: useLang(), setLocale: setLang };
}

export const formatLocaleDate = (iso: string | null | undefined, locale: AppLocale): string =>
  formatShortDate(iso, locale);

export const formatLocaleCount = (n: number, locale: AppLocale): string => formatCount(n, locale);
