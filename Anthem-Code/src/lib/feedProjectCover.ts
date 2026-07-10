/**
 * Feed / hero image URLs — shrink delivery without changing layout intent.
 * Demo seed often stores Unsplash with ?w=&h=&fit=crop; strip crop for masonry,
 * and always cap width + auto-format for PageSpeed (especially mobile).
 *
 * Supabase Storage Image Transformation is not applied here (requires Pro);
 * Unsplash + size caps cover the bulk of home-feed payload.
 */

export type FeedImageOpts = {
  /** Max display width in CSS px (device-independent). Default 800. */
  width?: number;
  /** 1–100. Default 75. */
  quality?: number;
  /** Keep original aspect (no Unsplash crop). Default true for feed. */
  natural?: boolean;
};

function optimizeUnsplash(
  parsed: URL,
  opts: Required<Pick<FeedImageOpts, "width" | "quality" | "natural">>,
) {
  if (opts.natural) {
    parsed.searchParams.delete("h");
    parsed.searchParams.delete("fit");
    parsed.searchParams.delete("crop");
    parsed.searchParams.set("fit", "max");
  } else {
    if (!parsed.searchParams.has("fit")) parsed.searchParams.set("fit", "crop");
    if (!parsed.searchParams.has("h")) {
      parsed.searchParams.set("h", String(Math.round((opts.width * 3) / 4)));
    }
  }
  parsed.searchParams.set("w", String(opts.width));
  parsed.searchParams.set("q", String(opts.quality));
  parsed.searchParams.set("auto", "format");
  return parsed.toString();
}

/**
 * Resize/reformat remote covers for feed cards and hero.
 * Falls back to original URL when the host is unknown.
 */
export function optimizedFeedImageUrl(
  url: string | null | undefined,
  opts: FeedImageOpts = {},
): string {
  const trimmed = url?.trim();
  if (!trimmed) return "";

  const width = opts.width ?? 800;
  const quality = opts.quality ?? 75;
  const natural = opts.natural ?? true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "images.unsplash.com") {
      return optimizeUnsplash(parsed, { width, quality, natural });
    }
  } catch {
    /* keep original */
  }

  return trimmed;
}

/** Feed masonry — original proportions, capped width. */
export function naturalFeedCoverUrl(url: string | null | undefined): string {
  return optimizedFeedImageUrl(url, { width: 640, quality: 70, natural: true });
}

/** Hero default src (mobile-first). Prefer heroFeedCoverSrcSet + sizes. */
export function heroFeedCoverUrl(url: string | null | undefined): string {
  return optimizedFeedImageUrl(url, { width: 800, quality: 68, natural: true });
}

/** Responsive hero sources for LCP on mobile vs desktop. */
export function heroFeedCoverSrcSet(url: string | null | undefined): string {
  const trimmed = url?.trim();
  if (!trimmed) return "";
  const mobile = optimizedFeedImageUrl(trimmed, { width: 720, quality: 68, natural: true });
  const tablet = optimizedFeedImageUrl(trimmed, { width: 1100, quality: 70, natural: true });
  const desktop = optimizedFeedImageUrl(trimmed, { width: 1400, quality: 70, natural: true });
  if (!mobile) return "";
  // Non-Unsplash: single URL repeated is fine
  if (mobile === trimmed) return trimmed;
  return `${mobile} 720w, ${tablet} 1100w, ${desktop} 1400w`;
}

/** Designer card thumbs (small grid cells). */
export function thumbFeedCoverUrl(url: string | null | undefined): string {
  return optimizedFeedImageUrl(url, { width: 280, quality: 68, natural: false });
}
