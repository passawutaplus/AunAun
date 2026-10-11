import type { Tier } from "@/core/subscription/useSubscription";
import type { Model3dFormat } from "@/lib/flexGridLayout";
import { model3dFormatFromFile } from "@/lib/model3dAccept";
import { uploadAnthemMedia } from "@/lib/sharedMediaUpload";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

/** 3D models can be large; cap raw upload size. */
const MAX_MODEL3D_MB = 25;

const CONTENT_TYPE: Record<Model3dFormat, string> = {
  stl: "model/stl",
  obj: "model/obj",
};

/** Upload an STL/OBJ model to shared `project-media` (SAMECOR namespace). Returns the public URL. */
export async function uploadProjectModel3d(
  file: File,
  userId: string,
  folder: string,
  tier: Tier = "free",
  reporter?: UploadStageReporter,
  signal?: AbortSignal,
): Promise<{ url: string; format: Model3dFormat }> {
  const format = model3dFormatFromFile(file);
  if (!format) throw new Error("รองรับเฉพาะไฟล์ .stl และ .obj");

  if (file.size > MAX_MODEL3D_MB * 1024 * 1024) {
    throw new Error(`ไฟล์ 3D ใหญ่เกิน ${MAX_MODEL3D_MB}MB`);
  }

  const url = await uploadAnthemMedia({
    file,
    ext: format,
    contentType: CONTENT_TYPE[format],
    userId,
    folder,
    tier,
    stage: UPLOAD_STAGE.uploadingModel3d,
    reporter,
    signal,
  });
  return { url, format };
}
