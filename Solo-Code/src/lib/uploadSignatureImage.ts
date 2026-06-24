/** Resize signature image to PNG with alpha preserved — do NOT use JPEG compress. */

import { assertFileSignature, type AllowedKind } from "@/lib/fileSignature";

const SIG_KINDS: readonly AllowedKind[] = ["png", "webp"];
const MAX_DIM = 800;
const INPUT_MAX_BYTES = 5 * 1024 * 1024;
const OUTPUT_MAX_BYTES = 800 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function signatureBlobFromDataUrl(dataUrl: string): Blob {
  const [meta, base64 = ""] = dataUrl.split(",");
  const mime = meta.match(/^data:([^;]+);base64$/)?.[1] ?? "image/png";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Prepare freelancer signature: PNG/WebP only, resize longest side to ~800px, keep transparency.
 */
export async function prepareSignatureImage(file: File): Promise<{ blob: Blob; ext: string }> {
  if (file.size > INPUT_MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 5MB) — ใช้ PNG พื้นหลังโปร่งใส");
  }
  await assertFileSignature(file, SIG_KINDS);

  const dataUrl = await readDataURL(file);
  const img = await loadImage(dataUrl);
  const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถประมวลผลรูปได้");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const outDataUrl = canvas.toDataURL("image/png");
  const blob = signatureBlobFromDataUrl(outDataUrl);
  if (blob.size > OUTPUT_MAX_BYTES) {
    throw new Error("ลายเซ็นใหญ่เกินไปหลังย่อ — ลองใช้รูปที่เล็กลง");
  }

  return { blob, ext: "png" };
}

export async function uploadSignatureImage(
  userId: string,
  file: File,
): Promise<{ publicUrl: string; path: string }> {
  const { blob, ext } = await prepareSignatureImage(file);
  const path = `${userId}/signature-${Date.now()}.${ext}`;
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.storage
    .from("brand-logos")
    .upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
