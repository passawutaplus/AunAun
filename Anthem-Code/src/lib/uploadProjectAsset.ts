import { sharedStorage } from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import {
  assertAnthemStorageAvailable,
  bumpAnthemStorageCache,
} from "@/lib/anthemStorageUsage";
import { isAllowedProjectAssetFile } from "@/lib/projectAssets";
import { PROJECT_ASSETS_BUCKET } from "@/lib/projectAssetStorage";

export async function uploadProjectAssetFile(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
): Promise<{ storage_path: string; file_name: string; mime_type: string; size_bytes: number }> {
  if (!isAllowedProjectAssetFile(file)) {
    throw new Error("ประเภทหรือขนาดไฟล์ไม่รองรับ");
  }

  await assertAnthemStorageAvailable(userId, tier, file.size);

  const safeName = file.name.replace(/[^\w.\-()]/g, "_").slice(0, 120);
  const path = `${userId}/${folder}/assets/${crypto.randomUUID()}-${safeName}`;

  const { error } = await sharedStorage.storage.from(PROJECT_ASSETS_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  bumpAnthemStorageCache(userId, file.size);

  return {
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  };
}
