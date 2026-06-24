import { supabase } from "@/integrations/supabase/client";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";

const BUCKET = "brief-references";
const HARD_MAX = 4 * 1024 * 1024; // 4MB safety cap for upload

/**
 * Upload a reference image for a Smart Brief.
 * - If userId provided -> stored at `{userId}/...`
 * - If anonymous (client filling via share link) -> stored at `public/{token}/...`
 * - Always compresses raster images to a small JPEG preview
 * - Throws Error with friendly Thai message on failure
 */
export async function uploadBriefReference(opts: {
  file: File;
  userId?: string | null;
  shareToken?: string | null;
}): Promise<{ url: string; name: string; size: number }> {
  const { file, userId, shareToken } = opts;

  let blob: Blob;
  let ext = "jpg";
  let contentType = "image/jpeg";

  try {
    if (file.type === "image/svg+xml") {
      if (file.size > HARD_MAX) throw new Error("ไฟล์ SVG ใหญ่เกิน 4MB");
      blob = file;
      ext = "svg";
      contentType = "image/svg+xml";
    } else if (file.type === "image/gif") {
      if (file.size > HARD_MAX) throw new Error("ไฟล์ GIF ใหญ่เกิน 4MB");
      blob = file;
      ext = "gif";
      contentType = "image/gif";
    } else {
      // Raster — compress to ~200KB JPEG
      const dataUrl = await compressImageFile(file);
      blob = dataUrlToBlob(dataUrl);
      if (blob.size > HARD_MAX) {
        throw new Error("ไม่สามารถบีบไฟล์ให้เล็กพอได้ ลองใช้รูปอื่น");
      }
    }
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "ประมวลผลรูปไม่สำเร็จ");
  }

  const folder = userId ? userId : `public/${shareToken ?? "anon"}`;
  const path = `${folder}/ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, cacheControl: "3600", upsert: false });

  if (error) {
    const msg = error.message || "";
    if (msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("denied")) {
      throw new Error("อัปโหลดไม่ได้ — กรุณาเข้าสู่ระบบใหม่ (RLS denied)");
    }
    throw new Error(`อัปโหลดไม่สำเร็จ: ${msg}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, size: blob.size };
}
