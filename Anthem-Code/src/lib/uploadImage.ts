import imageCompression from "browser-image-compression";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import {
  assertAnthemStorageAvailable,
  bumpAnthemStorageCache,
} from "@/lib/anthemStorageUsage";
import { uploadToSharedMedia } from "@/lib/sharedMediaUpload";
import { assertRealImage } from "@/lib/imageSignature";
import { normalizeImageForUpload } from "@/lib/normalizeImageUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

const MAX_INPUT_MB = 30;
/** Cropped community exports are already ≤1920px — skip second pass under this size. */
const SKIP_RECOMPRESS_MAX_BYTES = 1.5 * 1024 * 1024;

export type UploadProjectImageOptions = {
  /** File already cropped/resized — skip browser-image-compression when small enough. */
  skipCompression?: boolean;
  /** Do not block on a cold storage scan (quota refresh runs in background). */
  fastQuotaCheck?: boolean;
  /** Report compression/upload stage + percent for progress UI. */
  reporter?: UploadStageReporter;
};

function canSkipCompression(file: File): boolean {
  return file.size <= SKIP_RECOMPRESS_MAX_BYTES && file.type.startsWith("image/");
}

async function compressForUpload(
  file: File,
  skipCompression: boolean | undefined,
  reporter: UploadStageReporter | undefined,
): Promise<File> {
  if (skipCompression && canSkipCompression(file)) return file;

  reporter?.onStage?.(UPLOAD_STAGE.compressingImage);
  return imageCompression(file, {
    maxSizeMB: 1.0,
    maxWidthOrHeight: 1920,
    useWebWorker: false,
    fileType: "image/webp",
    initialQuality: 0.85,
    onProgress: reporter?.onPercent,
  });
}

/**
 * Upload an image to the SHARED storage backend (So1o Freelancer Management
 * project's `project-media` bucket). Returns the public URL.
 */
export async function uploadProjectImage(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  options?: UploadProjectImageOptions,
): Promise<string> {
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ใหญ่เกิน ${MAX_INPUT_MB}MB`);
  }

  // iPhone HEIC/HEIF → JPEG so desktop browsers can decode & compress it.
  const normalized = await normalizeImageForUpload(file, options?.reporter);
  if (!normalized.type.startsWith("image/")) throw new Error("ไฟล์ไม่ใช่รูปภาพ");

  await assertRealImage(normalized);

  const compressed = await compressForUpload(normalized, options?.skipCompression, options?.reporter);

  await assertAnthemStorageAvailable(userId, tier, compressed.size, {
    nonBlocking: options?.fastQuotaCheck,
  });

  const ext = compressed.type === "image/png" ? "png" : "webp";
  const contentType = compressed.type === "image/png" ? "image/png" : "image/webp";
  const name = `${crypto.randomUUID()}.${ext}`;
  const path = `anthem/${userId}/${folder}/${name}`;

  options?.reporter?.onStage?.(UPLOAD_STAGE.uploadingImage);
  await uploadToSharedMedia(path, compressed, contentType);

  bumpAnthemStorageCache(userId, compressed.size);

  const { data } = sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
