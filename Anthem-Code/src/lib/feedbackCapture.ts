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

function hideFeedbackUi(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  return !node.closest("[data-feedback-ui]");
}

/** Rasterize only the visible window — not the full scrolled document. */
export async function captureVisibleViewport(): Promise<string> {
  const { toJpeg } = await import("html-to-image");
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
    filter: hideFeedbackUi,
    style: {
      transform: `translate(${-scrollX}px, ${-scrollY}px)`,
      transformOrigin: "0 0",
    },
  });
}

export async function captureViewportOrRect(rect?: CaptureRect | null): Promise<string> {
  const viewport = await captureVisibleViewport();
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
