import type { Tier } from "@/core/subscription/useSubscription";
import { compressCommunityVideo } from "@/lib/compressCommunityVideo";
import { uploadProjectImage } from "@/lib/uploadImage";
import { isVideoFile } from "@/lib/videoAccept";
import { extractVideoPosterFile } from "@/lib/videoPoster";
import { abortable } from "@/lib/ffmpegCore";
import { uploadAnthemMedia } from "@/lib/sharedMediaUpload";
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

  return uploadAnthemMedia({
    file: prepared,
    ext: "mp4",
    contentType: "video/mp4",
    userId,
    folder,
    tier,
    stage: UPLOAD_STAGE.uploadingVideo,
    reporter,
    signal,
  });
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
