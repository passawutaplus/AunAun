export type CaptureRect = { x: number; y: number; width: number; height: number };

export function normalizeDragRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
): CaptureRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

export function clampRectToViewport(rect: CaptureRect, vw: number, vh: number): CaptureRect {
  const x = Math.max(0, Math.min(rect.x, vw));
  const y = Math.max(0, Math.min(rect.y, vh));
  const width = Math.max(0, Math.min(rect.width, vw - x));
  const height = Math.max(0, Math.min(rect.height, vh - y));
  return { x, y, width, height };
}

export function viewportRectToDocument(
  rect: CaptureRect,
  scrollX: number,
  scrollY: number,
): CaptureRect {
  return {
    x: rect.x + scrollX,
    y: rect.y + scrollY,
    width: rect.width,
    height: rect.height,
  };
}

export function scaleRect(rect: CaptureRect, scaleX: number, scaleY = scaleX): CaptureRect {
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("โหลดภาพแคปไม่สำเร็จ"));
    img.src = src;
  });
}

export async function cropDataUrl(dataUrl: string, rect: CaptureRect): Promise<string> {
  const img = await loadImage(dataUrl);
  const sx = Math.max(0, Math.round(rect.x));
  const sy = Math.max(0, Math.round(rect.y));
  const sw = Math.max(1, Math.round(Math.min(rect.width, img.width - sx)));
  const sh = Math.max(1, Math.round(Math.min(rect.height, img.height - sy)));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถครอปภาพได้");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function keepForCapture(node: Node): boolean {
  return !(node instanceof Element && node.hasAttribute("data-feedback-ui"));
}

/** 1×1 transparent pixel for images that fail to inline (CORS) so capture never stalls on them. */
const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const shrunkCache = new Map<string, string>();
const SHRINK_TIMEOUT_MS = 900;

function timeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => window.setTimeout(() => r(null), ms))]);
}

async function shrinkImage(src: string, width: number, height: number): Promise<string | null> {
  const key = `${src}@${width}x${height}`;
  const hit = shrunkCache.get(key);
  if (hit) return hit;
  const res = await fetch(src, { cache: "force-cache" });
  if (!res.ok) return null;
  const bitmap = await createImageBitmap(await res.blob(), {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "medium",
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const out = canvas.toDataURL("image/webp", 0.8);
  shrunkCache.set(key, out);
  return out;
}

/**
 * html-to-image inlines every <img> on the page at full resolution (base64), which is what made capture
 * take seconds on the feed. Swap visible images for copies sized to how they are drawn, off-screen ones
 * for empty placeholders, and return a restore function.
 */
async function shrinkVisibleImages(): Promise<() => void> {
  const swaps: { el: Element; attr: string; value: string | null }[] = [];
  const jobs = Array.from(document.images).map(async (img) => {
    if (img.closest("[data-feedback-ui]") || !(img.currentSrc || img.src)) return;
    const r = img.getBoundingClientRect();
    const loaded = img.complete && img.naturalWidth > 0;
    const offscreen =
      !loaded ||
      r.width < 1 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
    let small: string | null;
    if (offscreen) {
      // Not in the shot: an empty SVG with the same natural size keeps layout identical at no cost
      small = `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}"/>`,
      )}`;
    } else {
      // Cover-style draw scale; never upscale
      const scale = Math.min(1, Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight));
      if (scale > 0.66) return;
      const w = Math.max(1, Math.ceil(img.naturalWidth * scale));
      const h = Math.max(1, Math.ceil(img.naturalHeight * scale));
      small = await timeout(shrinkImage(img.currentSrc || img.src, w, h).catch(() => null), SHRINK_TIMEOUT_MS);
    }
    if (!small) return;
    const picture = img.parentElement?.tagName === "PICTURE" ? img.parentElement : null;
    picture?.querySelectorAll("source").forEach((source) => {
      swaps.push({ el: source, attr: "srcset", value: source.getAttribute("srcset") });
      source.removeAttribute("srcset");
    });
    swaps.push({ el: img, attr: "srcset", value: img.getAttribute("srcset") });
    swaps.push({ el: img, attr: "src", value: img.getAttribute("src") });
    img.removeAttribute("srcset");
    img.setAttribute("src", small);
  });
  await Promise.all(jobs);
  return () => {
    for (let i = swaps.length - 1; i >= 0; i -= 1) {
      const { el, attr, value } = swaps[i];
      if (value === null) el.removeAttribute(attr);
      else el.setAttribute(attr, value);
    }
  };
}

/** Rasterize only the visible window — not the full scrolled document. */
export async function captureVisibleViewport(): Promise<string> {
  const { toJpeg } = await import("html-to-image");
  const restore = await shrinkVisibleImages();
  try {
    return await rasterizeViewport(toJpeg);
  } finally {
    restore();
  }
}

async function rasterizeViewport(toJpeg: typeof import("html-to-image").toJpeg): Promise<string> {
  const width = Math.max(1, Math.round(window.innerWidth));
  const height = Math.max(1, Math.round(window.innerHeight));
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const bgRaw =
    getComputedStyle(document.body).backgroundColor ||
    getComputedStyle(document.documentElement).backgroundColor;
  const bg =
    !bgRaw || bgRaw === "transparent" || bgRaw === "rgba(0, 0, 0, 0)" ? "#111111" : bgRaw;

  return toJpeg(document.documentElement, {
    cacheBust: false,
    pixelRatio: 1,
    quality: 0.82,
    skipFonts: true,
    backgroundColor: bg,
    width,
    height,
    canvasWidth: width,
    canvasHeight: height,
    filter: keepForCapture,
    imagePlaceholder: BLANK_PIXEL,
    style: {
      transform: `translate(${-scrollX}px, ${-scrollY}px)`,
      transformOrigin: "0 0",
    },
  });
}

export type ViewportPrecapture = { promise: Promise<string>; scrollX: number; scrollY: number };

/** Start rasterizing as soon as snip mode opens, so the drag overlaps the slow part. */
export function precaptureViewport(): ViewportPrecapture {
  const promise = captureVisibleViewport();
  promise.catch(() => undefined);
  return { promise, scrollX: window.scrollX, scrollY: window.scrollY };
}

export async function captureViewportOrRect(
  rect?: CaptureRect | null,
  pre?: ViewportPrecapture | null,
): Promise<string> {
  const fresh = !pre || pre.scrollX !== window.scrollX || pre.scrollY !== window.scrollY;
  const viewport = fresh ? await captureVisibleViewport() : await pre.promise.catch(() => captureVisibleViewport());
  if (!rect) return viewport;
  const img = await loadImage(viewport);
  const scaleX = img.width / Math.max(window.innerWidth, 1);
  const scaleY = img.height / Math.max(window.innerHeight, 1);
  return cropDataUrl(viewport, scaleRect(rect, scaleX, scaleY));
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
