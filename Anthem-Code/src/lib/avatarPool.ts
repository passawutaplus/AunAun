const GUEST_AVATAR_KEY = "anthem-guest-avatar-url";

let cachedUrls: string[] | null = null;

export type AvatarPoolManifest = {
  version: number;
  urls: string[];
};

export function setAvatarPoolUrls(urls: string[]) {
  cachedUrls = urls.filter(Boolean);
}

export function getAvatarPoolUrls(): string[] {
  return cachedUrls ?? [];
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickPoolUrlBySeed(seed: string, urls = getAvatarPoolUrls()): string | null {
  if (!urls.length) return null;
  return urls[hashString(seed) % urls.length] ?? null;
}

export function pickRandomPoolUrl(urls = getAvatarPoolUrls()): string | null {
  if (!urls.length) return null;
  return urls[Math.floor(Math.random() * urls.length)] ?? null;
}

/** Stable per-tab guest avatar; resets when the tab closes. */
export function getGuestAvatarUrl(urls = getAvatarPoolUrls()): string | null {
  if (!urls.length) return null;
  try {
    const existing = sessionStorage.getItem(GUEST_AVATAR_KEY);
    if (existing && urls.includes(existing)) return existing;
    const picked = pickRandomPoolUrl(urls);
    if (picked) sessionStorage.setItem(GUEST_AVATAR_KEY, picked);
    return picked;
  } catch {
    return pickRandomPoolUrl(urls);
  }
}

/** First grapheme of a name (legacy single-letter callers). */
export function displayInitial(name?: string | null): string {
  const letters = displayInitials(name, 1);
  return letters === "?" ? "?" : letters;
}

/**
 * Default avatar label: first N letters of username/display name.
 * Prefer username so new accounts without a photo show e.g. "NU" for "nutth".
 */
export function displayInitials(name?: string | null, count = 2): string {
  const cleaned = name?.trim().replace(/^@+/, "") ?? "";
  if (!cleaned) return "?";
  const chars = Array.from(cleaned);
  const slice = chars.slice(0, Math.max(1, count)).join("");
  return slice.toLocaleUpperCase("en-US");
}

export async function loadAvatarPoolManifest(): Promise<AvatarPoolManifest> {
  try {
    const res = await fetch("/avatar-pool/manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as AvatarPoolManifest;
    const urls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
    setAvatarPoolUrls(urls);
    return { version: data.version ?? 0, urls };
  } catch {
    setAvatarPoolUrls([]);
    return { version: 0, urls: [] };
  }
}
