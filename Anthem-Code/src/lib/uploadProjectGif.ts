import type { Tier } from "@/core/subscription/useSubscription";
import { prepareGif } from "@/lib/compressGif";
import { abortable } from "@/lib/ffmpegCore";
import { uploadAnthemMedia } from "@/lib/sharedMediaUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

/** Raw GIFs are capped low since large ones are auto-converted to mp4 first. */
const MAX_GIF_MB = 30;

export function isGifFile(file: File): boolean {
  return (
    file.type === "image/gif" || file.name.split(".").pop()?.toLowerCase() === "gif"
  );
}

/**
 * Upload an animated GIF to shared `project-media` (SAMECOR namespace).
 * Large GIFs are transcoded to a looping muted mp4 (much smaller); small ones
 * upload as-is. Returns the public URL and whether the result is a video.
 */
export async function uploadProjectGif(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  reporter?: UploadStageReporter,
  signal?: AbortSignal,
): Promise<{ url: string; isVideo: boolean }> {
  if (!isGifFile(file)) throw new Error("รองรับเฉพาะไฟล์ .gif");
  if (file.size > MAX_GIF_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ GIF ใหญ่เกิน ${MAX_GIF_MB}MB`);
  }

  const prepared = await abortable(prepareGif(file, reporter), signal, true);
  const upload = prepared.file;

  const url = await uploadAnthemMedia({
    file: upload,
    ext: prepared.isVideo ? "mp4" : "gif",
    contentType: prepared.isVideo ? "video/mp4" : "image/gif",
    userId,
    folder,
    tier,
    stage: prepared.isVideo ? UPLOAD_STAGE.uploadingVideo : UPLOAD_STAGE.uploadingGif,
    reporter,
    signal,
  });
  return { url, isVideo: prepared.isVideo };
}
