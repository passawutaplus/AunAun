import { bahttext } from "bahttext";

const DIGIT_WORDS: Array<[string, number]> = [
  ["เก้า", 9],
  ["แปด", 8],
  ["เจ็ด", 7],
  ["หก", 6],
  ["ห้า", 5],
  ["สี่", 4],
  ["สาม", 3],
  ["ยี่", 2],
  ["สอง", 2],
  ["เอ็ด", 1],
  ["หนึ่ง", 1],
  ["ศูนย์", 0],
];

const SCALE_WORDS: Array<[string, number]> = [
  ["แสน", 100_000],
  ["หมื่น", 10_000],
  ["พัน", 1_000],
  ["ร้อย", 100],
  ["สิบ", 10],
];

const BIG_SCALES = new Set([1_000, 10_000, 100_000]);

/** Strip spaces and currency suffixes for fuzzy text comparison. */
export function normalizeThaiBahtText(text: string): string {
  return (text ?? "")
    .replace(/\s+/g, "")
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]/g, "")
    .replace(/บาทถ้วน/gi, "")
    .replace(/บาท/gi, "")
    .replace(/ถ้วน/gi, "")
    .replace(/สตางค์/gi, "")
    .replace(/^ลบ/i, "");
}

/**
 * Parse Thai baht text (e.g. "หกร้อยบาทถ้วน") to a numeric amount in baht.
 * Returns null when the text cannot be parsed.
 */
export function parseThaiBahtText(text: string): number | null {
  const raw = (text ?? "").trim().replace(/\s+/g, "");
  if (!raw) return null;

  let negative = false;
  let body = raw;
  if (body.startsWith("ลบ")) {
    negative = true;
    body = body.slice(2);
  }

  const [bahtPartRaw, satangPartRaw = ""] = body.split("บาท");
  const bahtPart = bahtPartRaw.trim();
  if (!bahtPart) return null;

  const baht = parseThaiInteger(bahtPart);
  if (baht === null) return null;

  let satang = 0;
  const satangPart = satangPartRaw
    .replace(/ถ้วน/g, "")
    .replace(/สตางค์/g, "")
    .trim();
  if (satangPart) {
    const parsedSatang = parseThaiInteger(satangPart);
    if (parsedSatang === null) return null;
    satang = parsedSatang;
  }

  const total = baht + satang / 100;
  return negative ? -total : total;
}

function parseThaiInteger(text: string): number | null {
  if (!text) return 0;
  if (text === "ศูนย์") return 0;

  const segments = text.split("ล้าน");
  let total = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const value = parseThaiSegment(segment);
    if (value === null) return null;

    if (i < segments.length - 1) {
      total = (total + value) * 1_000_000;
    } else {
      total += value;
    }
  }

  return total;
}

function parseThaiSegment(text: string): number | null {
  if (!text) return 0;

  let total = 0;
  let subtotal = 0;
  let currentDigit = 0;
  let i = 0;

  const flushSubtotalToTotal = (scale: number) => {
    const chunk = subtotal + currentDigit;
    total += (chunk || 1) * scale;
    subtotal = 0;
    currentDigit = 0;
  };

  while (i < text.length) {
    let matched = false;

    for (const [word, scale] of SCALE_WORDS) {
      if (!text.startsWith(word, i)) continue;

      if (BIG_SCALES.has(scale)) {
        flushSubtotalToTotal(scale);
      } else if (scale === 10) {
        subtotal += (currentDigit || 1) * 10;
        currentDigit = 0;
      } else {
        subtotal += (currentDigit || 1) * scale;
        currentDigit = 0;
      }

      i += word.length;
      matched = true;
      break;
    }
    if (matched) continue;

    for (const [word, digit] of DIGIT_WORDS) {
      if (!text.startsWith(word, i)) continue;
      currentDigit += digit;
      i += word.length;
      matched = true;
      break;
    }
    if (!matched) return null;
  }

  return total + subtotal + currentDigit;
}

/** Round to 2 decimal places for baht comparison. */
export function roundBaht(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Validate that a numeric WHT amount matches the Thai text on the certificate.
 * Returns an error message when validation fails, otherwise null.
 *
 * When `requireBoth` is false (default), skips check if amount or text is missing
 * (caller should add a warning instead).
 */
export function validateWhtThaiText(
  numericBaht: number,
  thaiText: string,
  options?: { requireBoth?: boolean },
): string | null {
  const trimmed = (thaiText ?? "").trim();
  const requireBoth = options?.requireBoth ?? false;

  if (numericBaht <= 0 || !trimmed) {
    if (requireBoth && numericBaht > 0 && !trimmed) {
      return "ไม่พบข้อความจำนวนเงินภาษีภาษาไทยในใบ (เช่น หกร้อยบาทถ้วน) — ไม่สามารถยืนยันความถูกต้องได้";
    }
    return null;
  }

  const parsed = parseThaiBahtText(trimmed);
  if (parsed === null) {
    return `ไม่สามารถแปลงข้อความภาษาไทย "${trimmed}" เป็นตัวเลขได้`;
  }

  const expected = roundBaht(numericBaht);
  const got = roundBaht(parsed);
  if (Math.abs(expected - got) > 0.009) {
    const expectedText = bahttext(expected);
    return `ยอดภาษีตัวเลข (${expected.toLocaleString("en-US")}) ไม่ตรงกับข้อความภาษาไทย "${trimmed}" (แปลงได้ ${got.toLocaleString("en-US")}) — คาดหวัง ${expectedText}`;
  }

  return null;
}

/** Warning when amount is present but Thai text is missing. */
export function warnMissingThaiText(numericBaht: number, thaiText: string): string | null {
  if (numericBaht > 0 && !(thaiText ?? "").trim()) {
    return "ไม่พบข้อความจำนวนเงินภาษาไทยในใบ — กรุณาตรวจสอบด้วยตนเอง";
  }
  return null;
}
