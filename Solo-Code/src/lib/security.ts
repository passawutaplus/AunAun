/**
 * Security utilities — input sanitization & safe formatting.
 * Keep tiny & dependency-free so we can use them anywhere.
 */

/**
 * Strip control chars and HTML angle brackets from free-text inputs.
 * Prevents stored-XSS even if a future render switches to dangerouslySetInnerHTML.
 */
export function sanitizeText(input: string, maxLen = 200): string {
  return input
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "") // control chars
    .replace(/[<>]/g, "") // angle brackets
    .trim()
    .slice(0, maxLen);
}

/**
 * CSV / spreadsheet formula injection guard.
 * Excel/Sheets execute a cell that begins with = + - @ TAB CR.
 * Wrap the value in quotes and prefix with a single quote when risky.
 */
export function escapeCSV(value: string | number): string {
  const s = String(value ?? "");
  const risky = /^[=+\-@\t\r]/.test(s);
  const safe = risky ? `'${s}` : s;
  // Quote if contains delimiter / quote / newline
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Only allow http(s) URLs — blocks javascript:, data:, vbscript: schemes.
 * Returns null when the input is unsafe.
 */
export function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return null;
  } catch {
    return null;
  }
}

/**
 * Like safeUrl but also accepts in-app relative paths (starting with "/").
 * Use for href attributes that may point to internal routes OR external URLs.
 * Blocks "javascript:", "data:", and other dangerous schemes.
 */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Internal route — must start with single "/" (block "//evil.com" protocol-relative)
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  return safeUrl(s);
}

/** Generic message returned to clients — never expose raw DB / stack details. */
export const GENERIC_CLIENT_ERROR = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

/** Map internal errors to a safe client-facing string (always returns fallback). */
export function toClientError(_err: unknown, fallback = GENERIC_CLIENT_ERROR): string {
  return fallback;
}

/** Log internally, throw a sanitized Error for server fn / API responses. */
export function throwClientError(
  context: string,
  err: unknown,
  fallback = GENERIC_CLIENT_ERROR,
): never {
  console.error(`[${context}]`, err);
  throw new Error(toClientError(err, fallback));
}

/** Coerce to a finite, non-negative number within bounds. */
export function safeNumber(
  raw: string | number,
  opts: { min?: number; max?: number } = {},
): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[, ]/g, ""));
  if (!Number.isFinite(n)) return null;
  const { min = 0, max = 1e12 } = opts;
  if (n < min || n > max) return null;
  return n;
}
