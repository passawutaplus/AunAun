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

export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string,
  mimeType = "image/jpeg",
  outputSize?: { width: number; height: number },
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถครอปรูปได้");

  const outW = outputSize?.width ?? Math.round(pixelCrop.width);
  const outH = outputSize?.height ?? Math.round(pixelCrop.height);
  canvas.width = outW;
  canvas.height = outH;

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
      mimeType,
      0.92,
    );
  });

  const ext =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const safeName = fileName.replace(/\.\w+$/, "") || "image";
  return new File([blob], `${safeName}.${ext}`, { type: mimeType });
}
