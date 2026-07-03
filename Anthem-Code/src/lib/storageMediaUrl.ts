import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";

const SIGNED_TTL_SEC = 60 * 60;

export function isAbsoluteMediaUrl(ref: string): boolean {
  return /^https?:\/\//i.test(ref);
}

/** Resolve a storage object path or legacy public URL to a fetchable URL. */
export async function resolveStorageMediaUrl(
  ref: string,
  bucket = SHARED_MEDIA_BUCKET,
): Promise<string> {
  if (!ref.trim()) return ref;
  if (isAbsoluteMediaUrl(ref)) return ref;
  const path = ref.replace(/^project-media\//, "");
  const { data, error } = await sharedStorage.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_TTL_SEC);
  if (error || !data?.signedUrl) return ref;
  return data.signedUrl;
}

/** Store bucket-relative path (no public URL) after upload. */
export function storageObjectPath(bucket: string, fullPath: string): string {
  return fullPath;
}

/** Public URL for objects in the shared media bucket (portfolio gallery, assets). */
export function storageMediaPublicUrl(path: string): string {
  const normalized = path.replace(/^project-media\//, "");
  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(normalized);
  return data.publicUrl;
}

export { SHARED_MEDIA_BUCKET };
