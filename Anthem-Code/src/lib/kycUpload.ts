import imageCompression from "browser-image-compression";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";
import { isHeicByHint, normalizeImageForUpload } from "@/lib/normalizeImageUpload";

/** Original file ceiling (iPhone photos before compress). */
const MAX_INPUT_MB = 20;
/** Stored image target after compress. */
const COMPRESS_MAX_MB = 1.5;
const COMPRESS_MAX_EDGE = 2200;

export type KycDocType = "id_front" | "id_back" | "selfie" | "bank_book";

export const KYC_ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

/** Photos: JPG / PNG / WebP / iPhone HEIC. */
export const KYC_IMAGE_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif,.hif";

/** Bank book may also be a PDF scan or an in-app screenshot. */
export const KYC_FILE_ACCEPT = `${KYC_IMAGE_ACCEPT},application/pdf,.pdf`;

/** Selfie: camera or photo only (no PDF). */
export const KYC_SELFIE_ACCEPT = KYC_IMAGE_ACCEPT;

export const KYC_ID_FILE_HINT = "JPG, PNG";
export const KYC_FILE_HINT = "JPG, PNG หรือ PDF · สูงสุด 20 MB";

function normalizeMime(file: File): string {
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  if (t) return t;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic") || name.endsWith(".heif") || name.endsWith(".hif")) return "image/heic";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "";
}

export function isAllowedKycFile(file: File, opts?: { allowPdf?: boolean }): boolean {
  if (isHeicByHint(file)) return true;
  const mime = normalizeMime(file);
  if (!mime) return false;
  if (mime === "application/pdf") return opts?.allowPdf !== false;
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "image/heic" ||
    mime === "image/heif"
  );
}

export function acceptForKycDoc(docType: KycDocType): string {
  return docType === "bank_book" ? KYC_FILE_ACCEPT : KYC_IMAGE_ACCEPT;
}

/** Decode HEIC and reject oversized originals before quality/OCR. */
export async function prepareKycImage(file: File): Promise<File> {
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ใหญ่เกิน ${MAX_INPUT_MB}MB`);
  }
  return normalizeImageForUpload(file);
}

/** Upload KYC file — images are compressed automatically; PDF is bank-book only. */
export async function uploadKycDocument(
  file: File,
  userId: string,
  docType: KycDocType,
): Promise<string> {
  const allowPdf = docType === "bank_book";
  if (!isAllowedKycFile(file, { allowPdf })) {
    throw new Error(allowPdf ? KYC_FILE_HINT : KYC_ID_FILE_HINT);
  }
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ใหญ่เกิน ${MAX_INPUT_MB}MB`);
  }

  const mime = normalizeMime(file);

  if (mime === "application/pdf") {
    const path = `anthem/kyc/${userId}/${docType}/${crypto.randomUUID()}.pdf`;
    const { error } = await sharedStorage.storage
      .from(SHARED_MEDIA_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: true });
    if (error) throw error;
    return path;
  }

  const decoded = await normalizeImageForUpload(file);
  const compressed = await imageCompression(decoded, {
    maxSizeMB: COMPRESS_MAX_MB,
    maxWidthOrHeight: COMPRESS_MAX_EDGE,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.88,
  });

  const path = `anthem/kyc/${userId}/${docType}/${crypto.randomUUID()}.jpg`;
  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, compressed, { contentType: "image/jpeg", upsert: true });
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
