/**
 * Small copies of uploaded images, stored next to the original in `project-media`:
 *
 *   <file>            -> <file>.w640.webp   cards, grids, feed
 *   .../avatar/<file> -> <file>.w128.webp   avatars in lists
 *
 * Lists load the small copy; the single-work page keeps the full file. This is what keeps storage
 * egress inside the free plan (no image transformation there).
 * Keep the naming in step with scripts/backfill-thumbnails.mjs.
 */

const CARD_WIDTH = 640;
const AVATAR_WIDTH = 128;
const WEBP_QUALITY = 0.75;
const PUBLIC_PREFIX = "/storage/v1/object/public/project-media/";
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const THUMB_SUFFIX = /\.w\d+\.webp$/i;
/** Never shown in cards or grids: private chat files and old identity documents. */
const NO_THUMB_PREFIX = /^anthem\/(chat|kyc)\//;

/** True for a storage path that gets a small copy. */
export function hasThumb(path: string): boolean {
  return path.startsWith("anthem/") && !NO_THUMB_PREFIX.test(path) && IMAGE_EXT.test(path) && !THUMB_SUFFIX.test(path);
}

export function thumbWidthFor(path: string): number {
  return /\/avatar\//.test(path) ? AVATAR_WIDTH : CARD_WIDTH;
}

export function thumbPathFor(path: string): string {
  return `${path}.w${thumbWidthFor(path)}.webp`;
}

/** The original a small copy was made from, or null when `path` is not a small copy. */
export function originalPathFromThumb(path: string): string | null {
  return THUMB_SUFFIX.test(path) ? path.replace(THUMB_SUFFIX, "") : null;
}

/** Storage path of a public `project-media` URL when it has a small copy, otherwise null. */
export function thumbablePath(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.endsWith(".supabase.co") || !parsed.pathname.startsWith(PUBLIC_PREFIX)) return null;
    const path = decodeURIComponent(parsed.pathname.slice(PUBLIC_PREFIX.length));
    return hasThumb(path) ? path : null;
  } catch {
    return null;
  }
}

/** URL of the small copy, or the URL unchanged when there is none (other hosts, videos, files). */
export function thumbUrlFor(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? "";
  const path = thumbablePath(trimmed);
  if (!path) return trimmed;
  const parsed = new URL(trimmed);
  return `${parsed.origin}${parsed.pathname}.w${thumbWidthFor(path)}.webp`;
}

/** `src` for an image shown small (card, grid cell, list row): the small copy when there is one. */
export function cardImageSrc(url: string | null | undefined): string | undefined {
  return thumbUrlFor(url) || undefined;
}

/** Full-size URL behind a small-copy URL, or null when `url` is not one. */
export function originalUrlFromThumb(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  const [base] = trimmed.split(/[?#]/);
  return base.includes(PUBLIC_PREFIX) && THUMB_SUFFIX.test(base) ? base.replace(THUMB_SUFFIX, "") : null;
}

/**
 * One listener for the whole app: when a small copy is missing (an upload from an old app version,
 * or made before the backfill ran) the image falls back to the original instead of breaking.
 */
export function installThumbFallback(): void {
  if (typeof window === "undefined") return;
  window.addEventListener(
    "error",
    (event) => {
      const el = event.target;
      if (!(el instanceof HTMLImageElement)) return;
      // Only a small copy is retried. When the original fails too it is not one, so this cannot loop.
      const original = originalUrlFromThumb(el.currentSrc || el.src);
      if (!original) return;
      // The image is not broken yet: keep the component's own onError (grey placeholder) and the
      // error reporters out of it until the original has had its turn.
      event.stopImmediatePropagation();
      el.dataset.thumbFallback = "1";
      if (el.srcset) el.srcset = el.srcset.replace(/\.w\d+\.webp/gi, "");
      el.src = originalUrlFromThumb(el.src) ?? original;
    },
    true, // image load errors do not bubble
  );
}

/** Resize in the browser to a webp no wider than `width`. Null when the browser cannot do it. */
export async function makeThumbBlob(file: Blob, width: number): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, width / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    // Browsers without a webp encoder hand back a PNG: skip, the fallback above covers it.
    return blob && blob.type === "image/webp" ? blob : null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
