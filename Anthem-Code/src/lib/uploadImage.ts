import imageCompression from "browser-image-compression";
import type { Tier } from "@/core/subscription/useSubscription";
import { uploadAnthemMedia, uploadToSharedMedia } from "@/lib/sharedMediaUpload";
import { bumpAnthemStorageCache } from "@/lib/anthemStorageUsage";
import { makeThumbBlob, thumbPathFor, thumbWidthFor, thumbablePath } from "@/lib/mediaThumb";
import { assertRealImage } from "@/lib/imageSignature";
import { normalizeImageForUpload } from "@/lib/normalizeImageUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

export const IMAGE_UPLOAD_MAX_INPUT_MB = 30;
const MAX_INPUT_MB = IMAGE_UPLOAD_MAX_INPUT_MB;
/** Cropped community exports are already ≤1920px — skip second pass under this size. */
const SKIP_RECOMPRESS_MAX_BYTES = 1.5 * 1024 * 1024;

export function assertImageWithinUploadLimit(file: File): void {
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ใหญ่เกิน ${MAX_INPUT_MB}MB`);
  }
}

export type UploadProjectImageOptions = {
  /** File already cropped/resized — skip browser-image-compression when small enough. */
  skipCompression?: boolean;
  /** Do not block on a cold storage scan (quota refresh runs in background). */
  fastQuotaCheck?: boolean;
  /** Report compression/upload stage + percent for progress UI. */
  reporter?: UploadStageReporter;
  /** Cancel in-flight upload (checked between stages / retries). */
  signal?: AbortSignal;
};

/** PNG never skips: a cropped cover comes out as a ~1 MB PNG, and as webp it is a fraction of that. */
function canSkipCompression(file: File): boolean {
  return file.size <= SKIP_RECOMPRESS_MAX_BYTES && file.type.startsWith("image/") && file.type !== "image/png";
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
    useWebWorker: true,
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
  assertImageWithinUploadLimit(file);

  // iPhone HEIC/HEIF → JPEG so desktop browsers can decode & compress it.
  const normalized = await normalizeImageForUpload(file, options?.reporter);
  if (!normalized.type.startsWith("image/")) throw new Error("ไฟล์ไม่ใช่รูปภาพ");

  await assertRealImage(normalized);

  const compressed = await compressForUpload(normalized, options?.skipCompression, options?.reporter);

  const isPng = compressed.type === "image/png";
  const url = await uploadAnthemMedia({
    file: compressed,
    ext: isPng ? "png" : "webp",
    contentType: isPng ? "image/png" : "image/webp",
    userId,
    folder,
    tier,
    stage: UPLOAD_STAGE.uploadingImage,
    reporter: options?.reporter,
    signal: options?.signal,
    fastQuotaCheck: options?.fastQuotaCheck,
  });
  await uploadThumbFor(url, compressed, userId, options?.signal);
  return url;
}

const ONE_YEAR_SECONDS = "31536000";

/**
 * Small copy for cards and grids, next to the file just uploaded. Never fails the upload:
 * without it the image simply loads the original.
 */
async function uploadThumbFor(url: string, source: Blob, userId: string, signal?: AbortSignal): Promise<void> {
  try {
    const path = thumbablePath(url);
    if (!path) return;
    const thumb = await makeThumbBlob(source, thumbWidthFor(path));
    if (!thumb || signal?.aborted) return;
    await uploadToSharedMedia(thumbPathFor(path), thumb, "image/webp", 1, signal, undefined, ONE_YEAR_SECONDS);
    bumpAnthemStorageCache(userId, thumb.size);
  } catch (e) {
    console.warn("[upload] small copy not created", e);
  }
}
