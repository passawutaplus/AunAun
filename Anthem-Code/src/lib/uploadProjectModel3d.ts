import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import {
  assertAnthemStorageAvailable,
  bumpAnthemStorageCache,
} from "@/lib/anthemStorageUsage";
import type { Model3dFormat } from "@/lib/flexGridLayout";
import { model3dFormatFromFile } from "@/lib/model3dAccept";

/** 3D models can be large; cap raw upload size. */
const MAX_MODEL3D_MB = 25;

const CONTENT_TYPE: Record<Model3dFormat, string> = {
  stl: "model/stl",
  obj: "model/obj",
};

/** Upload an STL/OBJ model to shared `project-media` (Aplus1 namespace). Returns the public URL. */
export async function uploadProjectModel3d(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
): Promise<{ url: string; format: Model3dFormat }> {
  const format = model3dFormatFromFile(file);
  if (!format) throw new Error("รองรับเฉพาะไฟล์ .stl และ .obj");

  if (file.size > MAX_MODEL3D_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ 3D ใหญ่เกิน ${MAX_MODEL3D_MB}MB`);
  }

  await assertAnthemStorageAvailable(userId, tier, file.size);

  const name = `${crypto.randomUUID()}.${format}`;
  const path = `anthem/${userId}/${folder}/${name}`;

  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: CONTENT_TYPE[format],
      upsert: false,
    });
  if (error) throw error;

  bumpAnthemStorageCache(userId, file.size);

  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, format };
}
