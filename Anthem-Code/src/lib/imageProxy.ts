/**
 * Resize Supabase Storage images through Vercel Image Optimization (`/_vercel/image`).
 *
 * Supabase Free has no image transforms and only 5 GB cached egress a month, and every feed card,
 * avatar and project page used to download the full original (often 0.3–1 MB PNG/WebP). Vercel
 * fetches each original once, keeps the resized WebP in its CDN for 31 days and serves it from
 * there, so Supabase only sees one download per image and width.
 *
 * The widths and qualities below must match `images.sizes` / `images.qualities` in vercel.json —
 * Vercel rejects any other value. If the proxy ever fails, installImageProxyFallback() swaps the
 * <img> back to the original URL.
 */

export const IMAGE_PROXY_WIDTHS = [128, 256, 384, 640, 828, 1080, 1200, 1920] as const;
export const IMAGE_PROXY_QUALITIES = [70, 75, 80, 85] as const;

/** Same host as images.remotePatterns in vercel.json. */
const PROXY_HOSTS = new Set(["zkflkpbmbozrchqncpzi.supabase.co"]);
const PROXY_PATH = /^\/storage\/v1\/object\/public\//;
/** Raster formats only: SVG is not allowed by the optimizer, GIF/video must stay animated. */
const RASTER_EXT = /\.(jpe?g|png|webp|avif)$/i;

const PROXY_ENDPOINT = "/_vercel/image";

export function snapProxyWidth(width: number): number {
  for (const w of IMAGE_PROXY_WIDTHS) if (w >= width) return w;
  return IMAGE_PROXY_WIDTHS[IMAGE_PROXY_WIDTHS.length - 1];
}

export function snapProxyQuality(quality: number): number {
  let best: number = IMAGE_PROXY_QUALITIES[0];
  for (const q of IMAGE_PROXY_QUALITIES) {
    if (Math.abs(q - quality) < Math.abs(best - quality)) best = q;
  }
  return best;
}

/** True for public Supabase Storage images that the Vercel optimizer is allowed to fetch. */
export function isProxyableImageUrl(src: string): boolean {
  try {
    const u = new URL(src);
    return (
      u.protocol === "https:" &&
      PROXY_HOSTS.has(u.hostname) &&
      PROXY_PATH.test(u.pathname) &&
      RASTER_EXT.test(u.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Build the optimizer URL. `origin` is empty for same-site use; pass the site origin
 * (https://samecor.com) for URLs read outside the page, such as og:image.
 */
export function buildProxyImageUrl(src: string, width: number, quality = 75, origin = ""): string {
  const w = snapProxyWidth(width);
  const q = snapProxyQuality(quality);
  return `${origin}${PROXY_ENDPOINT}?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

function proxyEnabled(): boolean {
  if (!import.meta.env.PROD) return false; // vite dev server has no /_vercel/image
  return import.meta.env.VITE_IMAGE_PROXY !== "off"; // self-hosted (nginx) builds can opt out
}

/** Resized URL for a Supabase Storage image, or the input unchanged for anything else. */
export function proxiedImageUrl(
  src: string | null | undefined,
  width: number,
  quality = 75,
): string {
  const trimmed = src?.trim() ?? "";
  if (!trimmed || !proxyEnabled() || !isProxyableImageUrl(trimmed)) return trimmed;
  return buildProxyImageUrl(trimmed, width, quality);
}

/** `srcset` with width descriptors, or "" when the image is not proxied. */
export function proxiedImageSrcSet(
  src: string | null | undefined,
  widths: readonly number[],
  quality = 75,
): string {
  const trimmed = src?.trim() ?? "";
  if (!trimmed || !proxyEnabled() || !isProxyableImageUrl(trimmed)) return "";
  const snapped = [...new Set(widths.map(snapProxyWidth))].sort((a, b) => a - b);
  return snapped.map((w) => `${buildProxyImageUrl(trimmed, w, quality)} ${w}w`).join(", ");
}

/**
 * `src` / `srcSet` / `sizes` for a large content image (project pages). The browser picks the
 * width it needs for the screen; anything that cannot be proxied keeps its original `src`.
 */
export function responsiveImageProps(
  src: string,
  sizes: string,
  widths: readonly number[] = [640, 1080, 1920],
  quality = 85,
): { src: string; srcSet?: string; sizes?: string } {
  const srcSet = proxiedImageSrcSet(src, widths, quality);
  if (!srcSet) return { src };
  return { src: proxiedImageUrl(src, Math.max(...widths), quality), srcSet, sizes };
}

/** The original image URL inside an optimizer URL, or null. */
export function originalFromProxyUrl(src: string): string | null {
  if (!src.includes(`${PROXY_ENDPOINT}?`)) return null;
  try {
    const base = typeof window !== "undefined" ? window.location.href : "https://samecor.com/";
    return new URL(src, base).searchParams.get("url");
  } catch {
    return null;
  }
}

/**
 * Safety net: when an optimizer image fails to load (quota, outage, self-hosted build),
 * load the original instead so nothing on the page breaks.
 */
export function installImageProxyFallback(): void {
  if (typeof document === "undefined") return;
  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.proxyFallback) return;
      const original = originalFromProxyUrl(img.currentSrc || img.src);
      if (!original) return;
      img.dataset.proxyFallback = "1";
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = original;
    },
    true,
  );
}
