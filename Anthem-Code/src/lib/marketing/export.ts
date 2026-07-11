import { downloadBlob, downloadCsv, toCsv } from "@/lib/csv";
import { assertExportAllowed } from "./compliance";

export type ExportFormat = "csv" | "xlsx" | "pdf";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

/**
 * Excel-compatible SpreadsheetML (.xls) — no third-party xlsx dependency
 * (avoids SheetJS prototype-pollution / ReDoS advisories).
 */
export async function exportRowsToXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<void> {
  const safeName = escapeXml(sheetName.slice(0, 31) || "Sheet1");
  const tableRows = [headers, ...rows]
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell ?? "")}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${safeName}">
  <Table>${tableRows}</Table>
 </Worksheet>
</Workbook>`;

  const base = filename.replace(/\.(xlsx|xls)$/i, "");
  const blob = new Blob(["\ufeff", xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(`${base}.xls`, blob);
}

export function exportHtmlToPdf(title: string, htmlBody: string): void {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f5f5f5}
.note{margin-top:16px;font-size:11px;color:#666}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
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
