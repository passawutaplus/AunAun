import { supabase } from "@/integrations/supabase/client";
import {
  encodeFeedbackScreenshotRef,
  FEEDBACK_SCREENSHOT_BUCKET,
  parseFeedbackScreenshotRef,
} from "@/lib/feedbackTicket";

const MAX_EDGE = 1920;
const MAX_BYTES = 1.5 * 1024 * 1024;

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านภาพไม่สำเร็จ"));
    };
    img.src = url;
  });
}

export async function compressFeedbackImage(blob: Blob): Promise<Blob> {
  const img = await loadImageFromBlob(blob);
  let { width, height } = img;
  const maxSide = Math.max(width, height);
  if (maxSide > MAX_EDGE) {
    const scale = MAX_EDGE / maxSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  let out = await toBlob("image/webp", 0.82);
  if (!out || out.size > MAX_BYTES) out = await toBlob("image/jpeg", 0.8);
  if (!out) return blob;
  return out;
}

export async function uploadFeedbackScreenshot(userId: string, blob: Blob): Promise<string> {
  const compressed = await compressFeedbackImage(blob);
  if (compressed.size > 2 * 1024 * 1024) {
    throw new Error("INVALID: ไฟล์ภาพใหญ่เกินไป");
  }
  const ext = compressed.type === "image/jpeg" ? "jpg" : compressed.type === "image/png" ? "png" : "webp";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).upload(path, compressed, {
    cacheControl: "3600",
    contentType: compressed.type || "image/webp",
    upsert: false,
  });
  if (error) throw error;
  return encodeFeedbackScreenshotRef(path);
}

export async function signedFeedbackScreenshotUrl(
  ref: string,
  expiresIn = 3600,
): Promise<string | null> {
  const parsed = parseFeedbackScreenshotRef(ref);
  if (!parsed) return null;
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
