/** Google favicon service — works for any http(s) URL or bare domain. */
export function getFaviconUrl(urlOrDomain: string, size = 64): string | null {
  try {
    const raw = urlOrDomain.includes("://") ? urlOrDomain : `https://${urlOrDomain}`;
    const hostname = new URL(raw).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
  } catch {
    return null;
  }
}
