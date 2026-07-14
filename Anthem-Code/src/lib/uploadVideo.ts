import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import { assertAnthemStorageAvailable } from "@/lib/anthemStorageUsage";
import { compressCommunityVideo } from "@/lib/compressCommunityVideo";
import { isVideoFile } from "@/lib/videoAccept";

const MAX_VIDEO_MB = 15;

/** Upload a short community video to shared `project-media` (Aplus1 namespace). */
export async function uploadProjectVideo(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  onCompressProgress?: (pct: number) => void,
): Promise<string> {
  if (!isVideoFile(file)) throw new Error("ไฟล์ไม่ใช่วิดีโอ");

  const prepared = await compressCommunityVideo(file, onCompressProgress);

  if (prepared.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`วิดีโอใหญ่เกิน ${MAX_VIDEO_MB}MB`);
  }

  await assertAnthemStorageAvailable(userId, tier, prepared.size);

  const name = `${crypto.randomUUID()}.mp4`;
  const path = `anthem/${userId}/${folder}/${name}`;

  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, prepared, {
      contentType: "video/mp4",
      upsert: false,
    });
  if (error) throw error;

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
