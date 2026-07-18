import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import {
  assertAnthemStorageAvailable,
  bumpAnthemStorageCache,
} from "@/lib/anthemStorageUsage";
import { prepareGif } from "@/lib/compressGif";
import { uploadToSharedMedia } from "@/lib/sharedMediaUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

/** Raw GIFs are capped low since large ones are auto-converted to mp4 first. */
const MAX_GIF_MB = 30;

export function isGifFile(file: File): boolean {
  return (
    file.type === "image/gif" || file.name.split(".").pop()?.toLowerCase() === "gif"
  );
}

/**
 * Upload an animated GIF to shared `project-media` (Aplus1 namespace).
 * Large GIFs are transcoded to a looping muted mp4 (much smaller); small ones
 * upload as-is. Returns the public URL and whether the result is a video.
 */
export async function uploadProjectGif(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  reporter?: UploadStageReporter,
): Promise<{ url: string; isVideo: boolean }> {
  if (!isGifFile(file)) throw new Error("รองรับเฉพาะไฟล์ .gif");
  if (file.size > MAX_GIF_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ GIF ใหญ่เกิน ${MAX_GIF_MB}MB`);
  }

  const prepared = await prepareGif(file, reporter);
  const upload = prepared.file;

  await assertAnthemStorageAvailable(userId, tier, upload.size);

  const ext = prepared.isVideo ? "mp4" : "gif";
  const contentType = prepared.isVideo ? "video/mp4" : "image/gif";
  const name = `${crypto.randomUUID()}.${ext}`;
  const path = `anthem/${userId}/${folder}/${name}`;

  reporter?.onStage?.(prepared.isVideo ? UPLOAD_STAGE.uploadingVideo : UPLOAD_STAGE.uploadingGif);
  await uploadToSharedMedia(path, upload, contentType);

  bumpAnthemStorageCache(userId, upload.size);

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, isVideo: prepared.isVideo };
}
