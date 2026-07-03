/**
 * Feed project grid — use original image proportions (no CDN crop).
 * Demo seed stores Unsplash URLs with ?w=&h=&fit=crop; strip those for masonry.
 */
export function naturalFeedCoverUrl(url: string | null | undefined): string {
  const trimmed = url?.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.delete("h");
      parsed.searchParams.delete("fit");
      parsed.searchParams.delete("crop");
      if (!parsed.searchParams.has("w")) {
        parsed.searchParams.set("w", "1200");
      }
      if (!parsed.searchParams.has("q")) {
        parsed.searchParams.set("q", "80");
      }
      parsed.searchParams.set("auto", "format");
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }

  return trimmed;
}
