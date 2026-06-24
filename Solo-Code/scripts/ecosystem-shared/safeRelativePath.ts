/** Validate a post-login redirect path (shared Solo ↔ an1hem). */
export function safeRelativePath(raw?: string | null, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s) return fallback;
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//") || s.startsWith("/\\") || s.startsWith("/%2f") || s.startsWith("/%5c"))
    return fallback;
  if (/[a-z][a-z0-9+.-]*:/i.test(s.slice(1, 50))) return fallback;
  return s;
}
