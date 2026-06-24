import { supabase } from "@/integrations/supabase/client";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";

/**
 * Upload an image to the public `job-tracker` bucket.
 * folder must start with the user's auth uid (e.g. "<uid>/previews") for owner uploads,
 * or "slips/<jobId>" for anonymous client slip uploads.
 */
export async function uploadJobTrackerImage(file: File, folder: string): Promise<string> {
  let blob: Blob = file;
  let contentType = file.type;
  let ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  if (file.type !== "image/svg+xml" && file.type.startsWith("image/")) {
    try {
      const dataUrl = await compressImageFile(file);
      blob = dataUrlToBlob(dataUrl);
      contentType = "image/jpeg";
      ext = "jpg";
    } catch {
      // fall through; upload original
    }
  }
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("job-tracker")
    .upload(path, blob, { upsert: false, contentType });
  if (error) throw error;
  const { data } = supabase.storage.from("job-tracker").getPublicUrl(path);
  return data.publicUrl;
}
