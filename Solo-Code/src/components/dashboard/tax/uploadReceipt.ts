import { supabase } from "@/integrations/supabase/client";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";

/** Upload an expense receipt (image or PDF) to private `expense-receipts` bucket.
 * Returns a signed URL valid for ~7 days. */
export async function uploadExpenseReceipt(file: File): Promise<{ path: string; url: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("ต้องเข้าสู่ระบบก่อน");
  let blob: Blob = file;
  let contentType = file.type || "application/octet-stream";
  let ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    try {
      const dataUrl = await compressImageFile(file);
      blob = dataUrlToBlob(dataUrl);
      contentType = "image/jpeg";
      ext = "jpg";
    } catch {
      /* keep original */
    }
  }
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("expense-receipts")
    .upload(path, blob, { upsert: false, contentType });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("expense-receipts")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !data) throw signErr ?? new Error("ไม่สามารถสร้างลิงก์ได้");
  return { path, url: data.signedUrl };
}
