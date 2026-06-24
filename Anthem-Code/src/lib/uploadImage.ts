import imageCompression from "browser-image-compression";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import { assertAnthemStorageAvailable } from "@/lib/anthemStorageUsage";

const MAX_MB = 5;

/**
 * Upload an image to the SHARED storage backend (So1o Freelancer Management
 * project's `project-media` bucket). Returns the public URL.
 *
 * Storage is shared across the So1o workspace — DB/auth stay on the
 * current project, but media files live in one place.
 */
export async function uploadProjectImage(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์ไม่ใช่รูปภาพ");
  if (file.size > MAX_MB * 1024 * 1024)
    throw new Error(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`);

  await assertAnthemStorageAvailable(userId, tier, file.size);

  const compressed = await imageCompression(file, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.85,
  });

  const ext = "webp";
  const name = `${crypto.randomUUID()}.${ext}`;
  // Namespace under "anthem/" so we don't collide with Freelancer uploads.
  const path = `anthem/${userId}/${folder}/${name}`;

  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, compressed, {
      contentType: "image/webp",
      upsert: false,
    });
  if (error) throw error;

  const { data } = sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
