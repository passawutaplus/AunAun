import { dataUrlToBlob } from "@/lib/imageCompress";
import type { LabsActionStackItem, LabsFileItem } from "@/lib/labs/types";

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("โหลดรูปไม่สำเร็จ"));
    };
    img.src = url;
  });
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImageFromFile(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

const SOCIAL_SIZES: Record<string, { w: number; h: number }> = {
  ig_square: { w: 1080, h: 1080 },
  ig_story: { w: 1080, h: 1920 },
  fb_cover: { w: 820, h: 312 },
  linkedin: { w: 1200, h: 627 },
};

export async function processImageFile(
  item: LabsFileItem,
  actions: LabsActionStackItem[],
): Promise<Blob> {
  const img = await loadImageFromFile(item.file);
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  const resizeAction = actions.find((a) => a.id === "resize" && a.enabled);
  if (resizeAction) {
    const maxW = Number(resizeAction.settings.maxWidth ?? 1920);
    const maxH = Number(resizeAction.settings.maxHeight ?? 1920);
    const ratio = Math.min(1, maxW / w, maxH / h);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }

  const cropAction = actions.find((a) => a.id === "cropSocial" && a.enabled);
  if (cropAction) {
    const preset = String(cropAction.settings.preset ?? "ig_square");
    const target = SOCIAL_SIZES[preset] ?? SOCIAL_SIZES.ig_square;
    const scale = Math.max(target.w / w, target.h / h);
    w = Math.round(target.w);
    h = Math.round(target.h);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const ox = (dw - target.w) / 2;
    const oy = (dh - target.h) / 2;
    ctx.drawImage(img, -ox, -oy, dw, dh);
    return canvasToBlob(canvas, item.targetFormat, actions);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const watermark = actions.find((a) => a.id === "watermark" && a.enabled);
  if (watermark) {
    const text = String(watermark.settings.text ?? "© Preview");
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    const pad = 16;
    ctx.strokeText(text, pad, h - pad);
    ctx.fillText(text, pad, h - pad);
  }

  return canvasToBlob(canvas, item.targetFormat, actions);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: LabsFileItem["targetFormat"],
  actions: LabsActionStackItem[],
): Promise<Blob> {
  const convert = actions.find((a) => a.id === "convert" && a.enabled);
  const fmt = convert ? String(convert.settings.format ?? format) : format;
  const quality = Number(
    actions.find((a) => a.id === "compress" && a.enabled)?.settings.quality ?? 0.85,
  );

  const mime =
    fmt === "png" ? "image/png" : fmt === "webp" ? "image/webp" : "image/jpeg";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("สร้างไฟล์ไม่สำเร็จ"))),
      mime,
      mime === "image/png" ? undefined : quality,
    );
  });
}

export function estimateBlobSize(blob: Blob): number {
  return blob.size;
}

export function renameOutput(
  name: string,
  pattern: string,
  index: number,
): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.replace(/\.[^.]+$/, "");
  return pattern
    .replace("{name}", base)
    .replace("{index}", String(index + 1).padStart(2, "0"))
    .replace("{ext}", ext.replace(".", ""));
}

export { dataUrlToBlob };
