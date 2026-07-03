import { downloadCsv, toCsv } from "@/lib/csv";
import { assertExportAllowed } from "./compliance";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export function exportRowsToCsv(filename: string, headers: string[], rows: string[][]): void {
  const records = rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
  const csv = toCsv(records, headers);
  downloadCsv(filename.endsWith(".csv") ? filename : `${filename}.csv`, csv);
}

export async function exportRowsToXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportHtmlToPdf(title: string, htmlBody: string): void {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f5f5f5}
.note{margin-top:16px;font-size:11px;color:#666}
</style></head><body>
<h1>${title}</h1>
${htmlBody}
<p class="note">AI insight is decision support. Public data + user import only. PDPA/GDPR applies.</p>
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function guardedExport(
  format: ExportFormat,
  complianceConfirmed: boolean,
  rowsHaveSourceUrl: boolean,
  run: () => void | Promise<void>,
): void | Promise<void> {
  assertExportAllowed(complianceConfirmed, rowsHaveSourceUrl);
  return run();
}

export function rowsToHtmlTable(headers: string[], rows: string[][]): string {
  const th = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
