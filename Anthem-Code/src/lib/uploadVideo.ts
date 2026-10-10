import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import { assertAnthemStorageAvailable, bumpAnthemStorageCache } from "@/lib/anthemStorageUsage";
import { compressCommunityVideo } from "@/lib/compressCommunityVideo";
import { uploadProjectImage } from "@/lib/uploadImage";
import { isVideoFile } from "@/lib/videoAccept";
import { extractVideoPosterFile } from "@/lib/videoPoster";
import { abortable } from "@/lib/ffmpegCore";
import { uploadToSharedMedia } from "@/lib/sharedMediaUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

const MAX_VIDEO_MB = 50;

export type UploadedProjectVideo = {
  url: string;
  /** Auto-captured frame, or null if capture failed. */
  posterUrl: string | null;
};

/** Upload a short community video to shared `project-media` (SAMECOR namespace). */
export async function uploadProjectVideo(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  reporter?: UploadStageReporter,
  signal?: AbortSignal,
): Promise<string> {
  if (!isVideoFile(file)) throw new Error("ไฟล์ไม่ใช่วิดีโอ");

  const prepared = await abortable(compressCommunityVideo(file, reporter), signal, true);

  if (prepared.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`วิดีโอใหญ่เกิน ${MAX_VIDEO_MB}MB หลังบีบอัด — ลองคลิปสั้นลง`);
  }

  await assertAnthemStorageAvailable(userId, tier, prepared.size);

  const name = `${crypto.randomUUID()}.mp4`;
  const path = `anthem/${userId}/${folder}/${name}`;

  reporter?.onStage?.(UPLOAD_STAGE.uploadingVideo);
  await uploadToSharedMedia(path, prepared, "video/mp4", 2, signal, reporter?.onPercent);
  bumpAnthemStorageCache(userId, prepared.size);

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload video and best-effort auto poster from the first readable frame. */
export async function uploadProjectVideoWithPoster(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  reporter?: UploadStageReporter,
  signal?: AbortSignal,
): Promise<UploadedProjectVideo> {
  // Grab the poster while the video is compressing/uploading instead of before it.
  const posterPromise = extractVideoPosterFile(file).catch(() => null);

  const url = await uploadProjectVideo(file, userId, folder, tier, reporter, signal);
  const posterFile = await posterPromise;

  if (!posterFile) return { url, posterUrl: null };

  try {
    const posterUrl = await uploadProjectImage(posterFile, userId, folder, tier, {
      skipCompression: true,
      fastQuotaCheck: true,
    });
    return { url, posterUrl };
  } catch {
    return { url, posterUrl: null };
  }
}
