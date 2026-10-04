export const IMPORT_CODES = ["INVALID_URL", "UNSAFE_URL", "FETCH_FAILED", "UNSUPPORTED_CONTENT", "RATE_LIMITED"];

const STATUS = { INVALID_URL: 400, UNSAFE_URL: 400, FETCH_FAILED: 502, UNSUPPORTED_CONTENT: 415, RATE_LIMITED: 429 };

export function importError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = STATUS[code] || 400;
  return error;
}
