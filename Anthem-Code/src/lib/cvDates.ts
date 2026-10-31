/**
 * CV period points are stored as "YYYY-MM" (month known) or "YYYY"/free text
 * (legacy). The year is kept exactly as the owner typed it (2566 stays 2566),
 * only the month name is localised.
 */

export type CvDateLang = "th" | "en";

export const CV_MONTHS_SHORT: Record<CvDateLang, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
};

const MONTH_POINT = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR_ONLY = /^\d{4}$/;

export type PeriodPoint = { year: string; month: string };

/** null when the value is free text that the month/year inputs cannot represent. */
export function parsePeriodPoint(raw: string | null | undefined): PeriodPoint | null {
  const v = (raw ?? "").trim();
  if (!v) return { year: "", month: "" };
  const m = MONTH_POINT.exec(v);
  if (m) return { year: m[1], month: m[2] };
  if (YEAR_ONLY.test(v)) return { year: v, month: "" };
  return null;
}

/** "2566-05" → "2566-05"; year only → "2566"; incomplete input → "". */
export function composePeriodPoint(point: PeriodPoint): string {
  const year = point.year.replace(/\D/g, "").slice(0, 4);
  if (year.length !== 4) return "";
  return point.month ? `${year}-${point.month}` : year;
}

export function formatPeriodPoint(raw: string | null | undefined, lang: CvDateLang = "en"): string {
  const v = (raw ?? "").trim();
  const m = MONTH_POINT.exec(v);
  if (!m) return v;
  return `${CV_MONTHS_SHORT[lang][Number(m[2]) - 1]} ${m[1]}`;
}

export function formatPeriodRange(
  item: {
    period?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    isCurrent?: boolean | null;
  },
  presentLabel = "Present",
  lang: CvDateLang = "en",
): string {
  const start = formatPeriodPoint(item.periodStart, lang);
  const end = formatPeriodPoint(item.periodEnd, lang);
  if (start) {
    if (item.isCurrent) return `${start} - ${presentLabel}`;
    if (end) return `${start} - ${end}`;
    return start;
  }
  return (item.period ?? "").trim();
}
