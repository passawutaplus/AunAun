import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import {
  assertAnthemStorageAvailable,
  bumpAnthemStorageCache,
} from "@/lib/anthemStorageUsage";

/** GIFs are uploaded as-is (no compression) so animation is preserved. */
const MAX_GIF_MB = 15;

export function isGifFile(file: File): boolean {
  return (
    file.type === "image/gif" || file.name.split(".").pop()?.toLowerCase() === "gif"
  );
}

/** Upload an animated GIF to shared `project-media` (Aplus1 namespace). Returns the public URL. */
export async function uploadProjectGif(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
): Promise<string> {
  if (!isGifFile(file)) throw new Error("รองรับเฉพาะไฟล์ .gif");
  if (file.size > MAX_GIF_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ GIF ใหญ่เกิน ${MAX_GIF_MB}MB`);
  }

  await assertAnthemStorageAvailable(userId, tier, file.size);

  const name = `${crypto.randomUUID()}.gif`;
  const path = `anthem/${userId}/${folder}/${name}`;

  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: "image/gif",
      upsert: false,
    });
  if (error) throw error;

  bumpAnthemStorageCache(userId, file.size);

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
