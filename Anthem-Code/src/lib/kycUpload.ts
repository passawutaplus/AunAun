import imageCompression from "browser-image-compression";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";

const MAX_MB = 8;

export type KycDocType = "id_front" | "id_back" | "selfie" | "bank_book";

/** Upload KYC image — returns storage path (not public URL). */
export async function uploadKycDocument(
  file: File,
  userId: string,
  docType: KycDocType,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์ไม่ใช่รูปภาพ");
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`);

  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2200,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.88,
  });

  const path = `anthem/kyc/${userId}/${docType}/${crypto.randomUUID()}.webp`;
  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, compressed, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  return path;
}

export async function getKycSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
