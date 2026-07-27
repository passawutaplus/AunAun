import { isValidThaiIdLaserCode, isValidThaiNationalId } from "@/lib/kycIdentity";

export type KycOcrFields = {
  legalName?: string;
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  dateOfBirth?: string; // YYYY-MM-DD (Gregorian)
  expiryDate?: string;
  laserCode?: string;
};

export type KycOcrResult = KycOcrFields & {
  rawText: string;
  confidence: number;
  fieldsFound: (keyof KycOcrFields)[];
  side: "front" | "back" | "unknown";
};

/** Convert Buddhist year (e.g. 2540) to Gregorian when needed. */
export function toGregorianYear(year: number): number {
  if (year >= 2400) return year - 543;
  return year;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse DD/MM/YYYY or DD-MM-YYYY → YYYY-MM-DD (handles Buddhist era). */
export function parseThaiIdDate(raw: string): string | null {
  const m = raw.trim().match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!m) return null;
  const d = parseInt(m[1]!, 10);
  const mo = parseInt(m[2]!, 10);
  let y = toGregorianYear(parseInt(m[3]!, 10));
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export function extractNationalIdFromText(text: string): string | null {
  const compact = text.replace(/\s+/g, " ");
  const candidates = compact.match(/\d[\d\-\s]{12,20}\d/g) ?? [];
  for (const c of candidates) {
    const digits = c.replace(/\D/g, "");
    if (digits.length === 13 && isValidThaiNationalId(digits)) return digits;
  }
  // Fallback: any 13 consecutive digits with valid checksum
  const loose = text.replace(/\D/g, " ").match(/\d{13}/g) ?? [];
  for (const d of loose) {
    if (isValidThaiNationalId(d)) return d;
  }
  return null;
}

export function extractLaserCodeFromText(text: string): string | null {
  const upper = text.toUpperCase().replace(/\s+/g, "");
  const m = upper.match(/[A-Z]{2}\d[-\s]?\d{7}[-\s]?\d{2}/);
  if (!m) return null;
  const raw = m[0]!.replace(/[^A-Z0-9]/g, "");
  return isValidThaiIdLaserCode(raw) ? raw : null;
}

export function extractDatesFromText(text: string): string[] {
  const matches = text.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}/g) ?? [];
  const out: string[] = [];
  for (const m of matches) {
    const iso = parseThaiIdDate(m);
    if (iso && !out.includes(iso)) out.push(iso);
  }
  return out;
}

/**
 * Heuristic Thai/English name from ID-card OCR text.
 * Prefers lines after name keywords; falls back to title + two words.
 */
export function extractNameFromText(text: string): { legalName?: string; firstName?: string; lastName?: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const keywordIdx = lines.findIndex((l) =>
    /ชื่อตัว|ชื่อสกุล|Name|Surname|นามสกุล|ชื่อ-นามสกุล/i.test(l),
  );
  if (keywordIdx >= 0) {
    for (let i = keywordIdx; i < Math.min(keywordIdx + 4, lines.length); i++) {
      const line = lines[i]!;
      const cleaned = line
        .replace(/ชื่อตัวและชื่อสกุล|ชื่อตัว|ชื่อสกุล|นามสกุล|Name|Surname|Thai|English/gi, "")
        .replace(/^[:\-\s]+/, "")
        .trim();
      const titled = cleaned.match(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง)\s*(.+)$/);
      if (titled) {
        const rest = titled[2]!.trim().split(/\s+/).filter(Boolean);
        if (rest.length >= 2) {
          return {
            firstName: rest[0],
            lastName: rest.slice(1).join(" "),
            legalName: `${titled[1]} ${rest.join(" ")}`.trim(),
          };
        }
      }
      const words = cleaned.split(/\s+/).filter((w) => /[\u0E00-\u0E7FA-Za-z]/.test(w) && !/\d/.test(w));
      if (words.length >= 2 && words.join(" ").length >= 4) {
        return {
          firstName: words[0],
          lastName: words.slice(1).join(" "),
          legalName: words.join(" "),
        };
      }
    }
  }

  for (const line of lines) {
    const titled = line.match(/^(นาย|นางสาว|นาง)\s+([\u0E00-\u0E7F]+)\s+([\u0E00-\u0E7F]+)/);
    if (titled) {
      return {
        firstName: titled[2],
        lastName: titled[3],
        legalName: `${titled[1]} ${titled[2]} ${titled[3]}`,
      };
    }
  }

  return {};
}

export function parseThaiIdOcrText(text: string, sideHint: "front" | "back" | "unknown" = "unknown"): KycOcrResult {
  const nationalId = extractNationalIdFromText(text) ?? undefined;
  const laserCode = extractLaserCodeFromText(text) ?? undefined;
  const dates = extractDatesFromText(text);
  const name = extractNameFromText(text);

  // Front usually has DOB then expiry (expiry later chronologically for adults)
  let dateOfBirth: string | undefined;
  let expiryDate: string | undefined;
  if (dates.length === 1) {
    dateOfBirth = dates[0];
  } else if (dates.length >= 2) {
    const sorted = [...dates].sort();
    dateOfBirth = sorted[0];
    expiryDate = sorted[sorted.length - 1];
    // If both are far in future, prefer earlier as DOB only if < today-ish
    const now = new Date().toISOString().slice(0, 10);
    const past = sorted.filter((d) => d < now);
    const future = sorted.filter((d) => d >= now);
    if (past.length) dateOfBirth = past[0];
    if (future.length) expiryDate = future[future.length - 1];
  }

  const side: KycOcrResult["side"] =
    sideHint !== "unknown"
      ? sideHint
      : laserCode && !nationalId
        ? "back"
        : nationalId
          ? "front"
          : "unknown";

  const fields: KycOcrFields = {
    ...name,
    nationalId,
    dateOfBirth,
    expiryDate,
    laserCode,
  };

  const fieldsFound = (Object.keys(fields) as (keyof KycOcrFields)[]).filter((k) => !!fields[k]);

  return {
    ...fields,
    rawText: text,
    confidence: fieldsFound.length >= 3 ? 0.75 : fieldsFound.length >= 1 ? 0.45 : 0.1,
    fieldsFound,
    side,
  };
}

export type OcrProgress = { status: string; progress: number };

/** Client-side OCR via Tesseract (eng+tha). Dynamic import keeps main bundle smaller. */
export async function runKycIdOcr(
  imageSource: File | Blob | string,
  opts?: {
    side?: "front" | "back" | "unknown";
    onProgress?: (p: OcrProgress) => void;
  },
): Promise<KycOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("tha+eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" || m.status === "loading language traineddata") {
        opts?.onProgress?.({ status: m.status, progress: m.progress ?? 0 });
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageSource);
    return parseThaiIdOcrText(data.text || "", opts?.side ?? "unknown");
  } finally {
    await worker.terminate();
  }
}

export function mergeOcrFields(base: KycOcrFields, next: KycOcrFields): KycOcrFields {
  return {
    legalName: next.legalName || base.legalName,
    firstName: next.firstName || base.firstName,
    lastName: next.lastName || base.lastName,
    nationalId: next.nationalId || base.nationalId,
    dateOfBirth: next.dateOfBirth || base.dateOfBirth,
    expiryDate: next.expiryDate || base.expiryDate,
    laserCode: next.laserCode || base.laserCode,
  };
}
