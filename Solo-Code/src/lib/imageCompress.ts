// Centralized image compression for all uploads.
// Storage-saving targets: max 1280px on longest side, JPEG quality auto-tuned to ~200KB.
// Hard cap: 400KB. Reject inputs > 10MB at the gate.

import { supabase } from "@/integrations/supabase/client";
import { assertFileSignature, type AllowedKind } from "@/lib/fileSignature";

const IMG_KINDS: readonly AllowedKind[] = ["jpeg", "png", "webp", "gif", "svg"];

export const IMG_MAX_DIM = 1280;
export const IMG_TARGET_BYTES = 200 * 1024; // ~200KB target
export const IMG_HARD_MAX_BYTES = 400 * 1024; // never exceed ~400KB
export const IMG_INPUT_MAX_BYTES = 10 * 1024 * 1024; // reject input >10MB
export const IMG_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

const QUALITY_STEPS = [0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.34];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64 = ""] = dataUrl.split(",");
  const mime = meta.match(/^data:([^;]+);base64$/)?.[1] ?? "application/octet-stream";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Compress an image File to a small JPEG data URL.
 * - Resizes longest side to IMG_MAX_DIM
 * - Iteratively lowers quality to hit IMG_TARGET_BYTES
 * - Throws if input is too large or not an image
 */
export async function compressImageFile(file: File): Promise<string> {
  if (file.size > IMG_INPUT_MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB) กรุณาย่อก่อนอัปโหลด");
  }
  // MIME + extension + magic-byte signature must all agree
  await assertFileSignature(file, IMG_KINDS);

  // SVG / GIF: keep as-is if small enough
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    if (file.size <= IMG_HARD_MAX_BYTES) return readDataURL(file);
    throw new Error("ไฟล์ SVG/GIF ใหญ่เกิน 400KB");
  }

  const dataUrl = await readDataURL(file);
  const img = await loadImage(dataUrl);

  const ratio = Math.min(1, IMG_MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับการบีบอัดรูป");
  ctx.drawImage(img, 0, 0, w, h);

  const estimateBytes = (url: string) =>
    Math.floor((url.length - "data:image/jpeg;base64,".length) * 0.75);

  let out = canvas.toDataURL("image/jpeg", QUALITY_STEPS[0]);
  for (const q of QUALITY_STEPS) {
    out = canvas.toDataURL("image/jpeg", q);
    if (estimateBytes(out) <= IMG_TARGET_BYTES) return out;
  }
  // Fallback: scale further if still too large
  if (estimateBytes(out) > IMG_HARD_MAX_BYTES) {
    const c2 = document.createElement("canvas");
    c2.width = Math.round(w * 0.7);
    c2.height = Math.round(h * 0.7);
    c2.getContext("2d")!.drawImage(img, 0, 0, c2.width, c2.height);
    out = c2.toDataURL("image/jpeg", 0.5);
  }
  return out;
}

/**
 * Compress an image File and upload to a public Supabase Storage bucket.
 * Path is `{userId}/{prefix}-{timestamp}.jpg` (or .svg/.gif preserved).
 * Returns the public URL.
 */
export async function uploadCompressedImage(opts: {
  file: File;
  bucket: string;
  userId: string;
  prefix?: string;
  upsert?: boolean;
}): Promise<string> {
  const { file, bucket, userId, prefix = "img", upsert = false } = opts;

  // Always validate signature before any processing/upload
  await assertFileSignature(file, IMG_KINDS);

  let blob: Blob;
  let contentType: string;
  let ext: string;

  if (file.type === "image/svg+xml") {
    if (file.size > IMG_HARD_MAX_BYTES) throw new Error("ไฟล์ SVG ใหญ่เกิน 400KB");
    blob = file;
    contentType = "image/svg+xml";
    ext = "svg";
  } else if (file.type === "image/gif") {
    if (file.size > IMG_HARD_MAX_BYTES) throw new Error("ไฟล์ GIF ใหญ่เกิน 400KB");
    blob = file;
    contentType = "image/gif";
    ext = "gif";
  } else {
    const dataUrl = await compressImageFile(file);
    blob = dataUrlToBlob(dataUrl);
    contentType = "image/jpeg";
    ext = "jpg";
  }

  const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert, contentType, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
