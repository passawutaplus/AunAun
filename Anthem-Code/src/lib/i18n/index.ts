/**
 * Tiny UI translation layer (th / en / zh). No library: each string lives once with all three languages,
 * in a dictionary file per area (see ./exhibition/*). Event data from the DB is never translated here.
 *
 *   const L = { interested: { th: "สนใจ", en: "Interested", zh: "感兴趣" } } satisfies Dict;
 *   const t = useT(L);            // in components (re-renders when the language changes)
 *   t("interested")               // → "สนใจ"
 *   tr(L.daysLeft, { n: 3 })      // outside React: uses the saved language at call time
 *
 * Placeholders: {name} in any language; values are inserted as-is.
 */
import { useCallback, useSyncExternalStore } from "react";
import { LOCALE_CHANGE_EVENT, loadLocalePrefs, type AppLocale } from "@/lib/localePrefs";

export type Lang = AppLocale;
export type Entry = Record<Lang, string>;
export type Dict = Record<string, Entry>;
export type Vars = Record<string, string | number>;

export function getLang(): Lang {
  return loadLocalePrefs().locale;
}

function subscribe(cb: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Current UI language; components using it re-render when Settings changes it. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "th" as Lang);
}

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Translate one entry with the saved language (or `lang`). */
export function tr(entry: Entry, vars?: Vars, lang: Lang = getLang()): string {
  return fill(entry[lang] ?? entry.th, vars);
}

/** Hook: `t(key, vars)` bound to one dictionary and the live language. */
export function useT<D extends Dict>(dict: D) {
  const lang = useLang();
  return useCallback((key: keyof D, vars?: Vars) => tr(dict[key], vars, lang), [dict, lang]);
}

/** BCP-47 tag for Intl. Thai shows the Buddhist year (owner's choice, 2026-11-04). */
export function intlLocale(lang: Lang = getLang()): string {
  return lang === "th" ? "th-TH-u-ca-buddhist" : lang === "zh" ? "zh-CN" : "en-GB";
}

/** Format a date (Date or YYYY-MM-DD, read as a calendar day) with Intl in the UI language. */
export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions, lang: Lang = getLang()): string {
  const date = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00`) : d;
  return new Intl.DateTimeFormat(intlLocale(lang), opts).format(date);
}

/** "29 ต.ค. 2569 – 28 ก.พ. 2570" / "29 Oct 2026 – 28 Feb 2027" / "2026年10月29日 – 2027年2月28日". */
export function formatDateRange(start: string, end?: string | null, lang: Lang = getLang()): string {
  // zh "short" months come out numeric (2026/10/29); "long" gives 2026年10月29日.
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: lang === "zh" ? "long" : "short", year: "numeric" };
  const a = new Date(`${start.slice(0, 10)}T00:00:00`);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDate(a, opts, lang);
  const b = new Date(`${end.slice(0, 10)}T00:00:00`);
  const fmt = new Intl.DateTimeFormat(intlLocale(lang), opts);
  // formatRange drops the repeated year / month ("17 Oct – 15 Nov 2026").
  return typeof fmt.formatRange === "function" ? fmt.formatRange(a, b) : `${fmt.format(a)} – ${fmt.format(b)}`;
}

/** Shared words used across areas. */
export const COMMON = {
  cancel: { th: "ยกเลิก", en: "Cancel", zh: "取消" },
  close: { th: "ปิด", en: "Close", zh: "关闭" },
  edit: { th: "แก้ไข", en: "Edit", zh: "编辑" },
  notSpecified: { th: "ไม่ระบุ", en: "Not specified", zh: "未注明" },
  home: { th: "หน้าแรก", en: "Home", zh: "首页" },
  saveFailed: { th: "บันทึกไม่สำเร็จ ลองอีกครั้ง", en: "Couldn't save. Please try again.", zh: "保存失败，请重试" },
  openInGoogleMaps: { th: "เปิดใน Google Maps", en: "Open in Google Maps", zh: "在 Google 地图中打开" },
} satisfies Dict;
