export type DataFormat = "json" | "csv" | "unknown";

export type ParseError = {
  message: string;
  line?: number;
  column?: number;
};

export function detectFormat(input: string): DataFormat {
  const trimmed = input.trim();
  if (!trimmed) return "unknown";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.includes(",") || trimmed.includes(";") || trimmed.includes("\t")) return "csv";
  return "unknown";
}

export function parseJsonError(err: unknown): ParseError {
  if (!(err instanceof SyntaxError)) {
    return { message: err instanceof Error ? err.message : "ข้อมูล JSON ไม่ถูกต้อง" };
  }
  const msg = err.message;
  const posMatch = msg.match(/position (\d+)/i);
  if (posMatch) {
    const pos = Number(posMatch[1]);
    return { message: msg, line: 1, column: pos + 1 };
  }
  const lineCol = msg.match(/line (\d+) column (\d+)/i);
  if (lineCol) {
    return { message: msg, line: Number(lineCol[1]), column: Number(lineCol[2]) };
  }
  return { message: msg };
}

export function formatJson(input: string, indent = 2): { output: string; error?: ParseError } {
  try {
    const parsed = JSON.parse(input);
    return { output: JSON.stringify(parsed, null, indent) };
  } catch (e) {
    return { output: "", error: parseJsonError(e) };
  }
}

export function minifyJson(input: string): { output: string; error?: ParseError } {
  try {
    const parsed = JSON.parse(input);
    return { output: JSON.stringify(parsed) };
  } catch (e) {
    return { output: "", error: parseJsonError(e) };
  }
}

export function validateJson(input: string): { valid: boolean; error?: ParseError } {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: parseJsonError(e) };
  }
}

export function detectDelimiter(line: string): string {
  const counts = [
    { d: ",", n: (line.match(/,/g) ?? []).length },
    { d: ";", n: (line.match(/;/g) ?? []).length },
    { d: "\t", n: (line.match(/\t/g) ?? []).length },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0]?.n ? counts[0].d : ",";
}

export function parseCsv(
  input: string,
  delimiter?: string,
): { rows: string[][]; delimiter: string } {
  const lines = input.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const delim = delimiter ?? (lines[0] ? detectDelimiter(lines[0]) : ",");
  const rows = lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delim && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  });
  return { rows, delimiter: delim };
}

export function removeEmptyCsvRows(rows: string[][]): string[][] {
  return rows.filter((row) => row.some((c) => c.trim().length > 0));
}

export function csvToJson(input: string): { output: string; error?: ParseError } {
  try {
    const { rows } = parseCsv(input);
    const cleaned = removeEmptyCsvRows(rows);
    if (cleaned.length === 0) return { output: "[]" };
    const [header, ...body] = cleaned;
    const objects = body.map((row) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h || `col${i + 1}`] = row[i] ?? "";
      });
      return obj;
    });
    return { output: JSON.stringify(objects, null, 2) };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "แปลง CSV ไม่สำเร็จ" } };
  }
}

export function jsonToCsv(input: string): { output: string; error?: ParseError } {
  try {
    const parsed = JSON.parse(input);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) return { output: "" };
    const keys = [...new Set(arr.flatMap((o) => Object.keys(o as object)))];
    const lines = [
      keys.join(","),
      ...arr.map((row) =>
        keys
          .map((k) => {
            const v = String((row as Record<string, unknown>)[k] ?? "");
            return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(","),
      ),
    ];
    return { output: lines.join("\n") };
  } catch (e) {
    return { output: "", error: parseJsonError(e) };
  }
}

export const JSON_SAMPLE = `{
  "project": "โลโก้ร้านกาแฟ",
  "client": "คุณสมชาย",
  "deliverables": ["logo.svg", "brand-guide.pdf"],
  "status": "review"
}`;

export const CSV_SAMPLE = `name,role,email
คุณสมชาย,ลูกค้า,client@example.com
คุณสมหญิง,PM,pm@example.com`;
