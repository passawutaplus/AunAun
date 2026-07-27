import imageCompression from "browser-image-compression";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";

const MAX_MB = 8;

export type KycDocType = "id_front" | "id_back" | "selfie" | "bank_book";

export const KYC_ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
] as const;

/** For `<input accept>` — JPG / PNG / PDF only. */
export const KYC_FILE_ACCEPT = "image/jpeg,image/jpg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";

/** Selfie: camera or photo only (no PDF). */
export const KYC_SELFIE_ACCEPT = "image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png";

export const KYC_FILE_HINT = "อัปโหลดได้เฉพาะไฟล์ JPG, PNG หรือ PDF";

function normalizeMime(file: File): string {
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  if (t) return t;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "";
}

export function isAllowedKycFile(file: File, opts?: { allowPdf?: boolean }): boolean {
  const mime = normalizeMime(file);
  if (!mime) return false;
  if (mime === "application/pdf") return opts?.allowPdf !== false;
  return mime === "image/jpeg" || mime === "image/png";
}

/** Upload KYC file (JPG / PNG / PDF) — returns storage path (not public URL). */
export async function uploadKycDocument(
  file: File,
  userId: string,
  docType: KycDocType,
): Promise<string> {
  const allowPdf = docType !== "selfie";
  if (!isAllowedKycFile(file, { allowPdf })) {
    throw new Error(allowPdf ? KYC_FILE_HINT : "อัปโหลดได้เฉพาะไฟล์ JPG หรือ PNG");
  }
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`);

  const mime = normalizeMime(file);

  if (mime === "application/pdf") {
    const path = `anthem/kyc/${userId}/${docType}/${crypto.randomUUID()}.pdf`;
    const { error } = await sharedStorage.storage
      .from(SHARED_MEDIA_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: true });
    if (error) throw error;
    return path;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2200,
    useWebWorker: true,
    fileType: mime === "image/png" ? "image/png" : "image/jpeg",
    initialQuality: 0.88,
  });

  const ext = mime === "image/png" ? "png" : "jpg";
  const contentType = mime === "image/png" ? "image/png" : "image/jpeg";
  const path = `anthem/kyc/${userId}/${docType}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, compressed, { contentType, upsert: true });
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
