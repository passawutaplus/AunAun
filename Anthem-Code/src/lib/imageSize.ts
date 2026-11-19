/**
 * Natural image sizes for content blocks, measured in the browser before a project is saved, so the
 * public page can set width/height on each single image and the layout does not jump while it loads.
 */

const MEASURE_TIMEOUT_MS = 4000;

/** Loads an image (usually already cached by the editor) and returns its natural [width, height]. */
export function measureImage(
  url: string,
  timeoutMs = MEASURE_TIMEOUT_MS,
): Promise<[number, number] | null> {
  if (typeof Image === "undefined" || !url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => done(null), timeoutMs);
    function done(size: [number, number] | null) {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(size);
    }
    img.onload = () =>
      done(
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? [img.naturalWidth, img.naturalHeight]
          : null,
      );
    img.onerror = () => done(null);
    img.decoding = "async";
    img.src = url;
  });
}

type BlockLike = {
  type?: unknown;
  url?: unknown;
  mediaLayout?: unknown;
  urls?: unknown;
  size?: unknown;
};

function isSingleImage(b: BlockLike): b is BlockLike & { url: string } {
  if (b.type !== "image" || typeof b.url !== "string" || !b.url) return false;
  const urls = Array.isArray(b.urls) ? b.urls.filter(Boolean) : [];
  return (
    (b.mediaLayout === undefined || b.mediaLayout === "single") &&
    urls.length <= 1
  );
}

/** Adds `size` to single-image blocks that lack it. Never fails: unmeasurable images are left as they are. */
export async function withImageSizes<T>(blocks: T): Promise<T> {
  if (!Array.isArray(blocks)) return blocks;
  const out = await Promise.all(
    blocks.map(async (raw) => {
      const b = raw as BlockLike;
      if (
        !b ||
        typeof b !== "object" ||
        !isSingleImage(b) ||
        Array.isArray(b.size)
      )
        return raw;
      const size = await measureImage(b.url);
      return size ? { ...(raw as object), size } : raw;
    }),
  );
  return out as T;
}
