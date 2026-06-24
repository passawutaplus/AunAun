import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import { assertAnthemStorageAvailable } from "@/lib/anthemStorageUsage";

const MAX_VIDEO_MB = 15;

/** Upload a short portfolio video to shared `project-media` (Anthem namespace). */
export async function uploadProjectVideo(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("ไฟล์ไม่ใช่วิดีโอ");
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`วิดีโอใหญ่เกิน ${MAX_VIDEO_MB}MB`);
  }

  await assertAnthemStorageAvailable(userId, tier, file.size);

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const safeExt = ["mp4", "webm", "mov"].includes(ext) ? ext : "mp4";
  const name = `${crypto.randomUUID()}.${safeExt}`;
  const path = `anthem/${userId}/${folder}/${name}`;

  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
