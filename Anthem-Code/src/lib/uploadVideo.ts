import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import { assertAnthemStorageAvailable } from "@/lib/anthemStorageUsage";
import { compressCommunityVideo } from "@/lib/compressCommunityVideo";
import { isVideoFile } from "@/lib/videoAccept";
import { uploadToSharedMedia } from "@/lib/sharedMediaUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

const MAX_VIDEO_MB = 50;

/** Upload a short community video to shared `project-media` (Aplus1 namespace). */
export async function uploadProjectVideo(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  reporter?: UploadStageReporter,
): Promise<string> {
  if (!isVideoFile(file)) throw new Error("ไฟล์ไม่ใช่วิดีโอ");

  const prepared = await compressCommunityVideo(file, reporter);

  if (prepared.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`วิดีโอใหญ่เกิน ${MAX_VIDEO_MB}MB หลังบีบอัด — ลองคลิปสั้นลง`);
  }

  await assertAnthemStorageAvailable(userId, tier, prepared.size);

  const name = `${crypto.randomUUID()}.mp4`;
  const path = `anthem/${userId}/${folder}/${name}`;

  reporter?.onStage?.(UPLOAD_STAGE.uploadingVideo);
  await uploadToSharedMedia(path, prepared, "video/mp4");

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
