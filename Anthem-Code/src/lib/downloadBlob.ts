/**
 * How long a downloaded blob URL stays alive. WebKit (Safari and the iOS app) reads the blob after the
 * click handler returns, so revoking it straight away makes the download fail.
 */
export const BLOB_URL_LIFETIME_MS = 60_000;

/** Save a file the page built itself (JSON export, PDF, CSV). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
}
