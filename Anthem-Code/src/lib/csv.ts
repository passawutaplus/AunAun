/**
 * Lightweight CSV export. Escapes per RFC 4180 and triggers a browser download.
 * Always UTF-8 with BOM so Excel (Windows) shows Thai correctly.
 */

/** Excel needs this prefix to treat CSV as UTF-8 (not Windows-1252). */
export const CSV_UTF8_BOM = "\ufeff";

export function withCsvBom(csv: string): string {
  if (!csv) return `${CSV_UTF8_BOM}`;
  return csv.startsWith(CSV_UTF8_BOM) ? csv : `${CSV_UTF8_BOM}${csv}`;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return "";
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[])) as (keyof T)[];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.map((c) => escape(String(c))).join(",");
  const body = rows.map((row) => cols.map((c) => escape(row[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

/** CSV string ready for Excel (UTF-8 BOM included). */
export function toCsvForExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns?: (keyof T)[],
): string {
  return withCsvBom(toCsv(rows, columns));
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([withCsvBom(csv)], { type: "text/csv;charset=utf-8;" });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
