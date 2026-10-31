/** Validate a post-login redirect path (shared Solo ↔ an1hem). */
export function safeRelativePath(raw?: string | null, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s) return fallback;
  if (!s.startsWith("/")) return fallback;
  // Browsers drop tabs/newlines from URLs, so "/<tab>/evil.com" would become "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(s)) return fallback;
  const head = s.slice(0, 4).toLowerCase();
  if (head.startsWith("//") || head.startsWith("/\\") || head.startsWith("/%2f") || head.startsWith("/%5c"))
    return fallback;
  if (/[a-z][a-z0-9+.-]*:/i.test(s.slice(1, 50))) return fallback;
  return s;
}
