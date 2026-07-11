import type { Area } from "react-easy-crop";

const SQUARE_TOLERANCE = 0.02;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("โหลดรูปไม่สำเร็จ")));
    img.src = src;
  });
}

/** True when width ≈ height (within tolerance). */
export function isSquareImageSize(width: number, height: number, tolerance = SQUARE_TOLERANCE): boolean {
  if (!width || !height) return false;
  return Math.abs(width / height - 1) <= tolerance;
}

export async function isSquareImageFile(file: File, tolerance = SQUARE_TOLERANCE): Promise<boolean> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return isSquareImageSize(img.naturalWidth, img.naturalHeight, tolerance);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 0–100 → pixel radius (100 = fully rounded / half of shorter side). */
export function cornerRadiusFromPercent(
  width: number,
  height: number,
  percent: number,
): number {
  const p = Math.max(0, Math.min(100, percent));
  const maxR = Math.min(width, height) / 2;
  return (maxR * p) / 100;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export type CropExportOptions = {
  width?: number;
  height?: number;
  /** Corner roundness 0–100 (100 = fully rounded). */
  cornerRadiusPercent?: number;
};

/** Centered cover crop that fills `aspectRatio` (width/height). */
export function getCenteredCoverCropArea(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
): Area {
  const ratio = aspectRatio > 0 ? aspectRatio : 1;
  const imageAspect = imageWidth / Math.max(1, imageHeight);
  let cropW: number;
  let cropH: number;
  if (imageAspect > ratio) {
    cropH = imageHeight;
    cropW = imageHeight * ratio;
  } else {
    cropW = imageWidth;
    cropH = imageWidth / ratio;
  }
  return {
    x: Math.max(0, (imageWidth - cropW) / 2),
    y: Math.max(0, (imageHeight - cropH) / 2),
    width: Math.max(1, cropW),
    height: Math.max(1, cropH),
  };
}

/** Crop remote/object URL to aspect + export size (centered cover). */
export async function cropImageUrlToAspectFile(
  imageSrc: string,
  aspectRatio: number,
  fileName: string,
  mimeType = "image/png",
  outputSize?: CropExportOptions,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const pixelCrop = getCenteredCoverCropArea(image.naturalWidth, image.naturalHeight, aspectRatio);
  return getCroppedImageFile(imageSrc, pixelCrop, fileName, mimeType, outputSize);
}

/** Crop a local File to aspect (centered cover). */
export async function cropImageFileToAspectFile(
  file: File,
  aspectRatio: number,
  mimeType = "image/png",
  outputSize?: CropExportOptions,
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await cropImageUrlToAspectFile(
      objectUrl,
      aspectRatio,
      file.name || "crop.png",
      mimeType,
      outputSize,
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string,
  mimeType = "image/jpeg",
  outputSize?: CropExportOptions | { width: number; height: number },
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถครอปรูปได้");

  const opts = (outputSize ?? {}) as CropExportOptions;
  const outW = opts.width ?? Math.round(pixelCrop.width);
  const outH = opts.height ?? Math.round(pixelCrop.height);
  const cornerPct = typeof opts.cornerRadiusPercent === "number" ? opts.cornerRadiusPercent : 0;
  const radiusPx = cornerRadiusFromPercent(outW, outH, cornerPct);

  canvas.width = outW;
  canvas.height = outH;

  // Rounded corners need alpha — always use png for transparency.
  const exportMime = radiusPx > 0.5 ? "image/png" : mimeType;

  if (radiusPx > 0.5) {
    ctx.clearRect(0, 0, outW, outH);
    roundRectPath(ctx, 0, 0, outW, outH, radiusPx);
    ctx.clip();
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("ไม่สามารถครอปรูปได้"))),
      exportMime,
      0.92,
    );
  });

  const ext =
    exportMime === "image/png" ? "png" : exportMime === "image/webp" ? "webp" : "jpg";
  const safeName = fileName.replace(/\.\w+$/, "") || "image";
  return new File([blob], `${safeName}.${ext}`, { type: exportMime });
}
