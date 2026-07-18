import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry only transient failures (network drop / 5xx), never client-side rejects. */
function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number; statusCode?: number })?.status
    ?? (error as { statusCode?: number })?.statusCode;
  if (typeof status === "number") return status >= 500 || status === 429;
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return msg.includes("failed to fetch") || msg.includes("network") || msg.includes("timeout");
}

/**
 * Upload to the shared project-media bucket with a couple of retries on
 * transient network errors. The caller passes a unique path per file, so
 * retrying the same path is safe (the object was never created on failure).
 */
export async function uploadToSharedMedia(
  path: string,
  body: Blob | File,
  contentType: string,
  retries = 2,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { error } = await sharedStorage.storage
      .from(SHARED_MEDIA_BUCKET)
      .upload(path, body, { contentType, upsert: false });
    if (!error) return;
    lastErr = error;
    if (!isRetryable(error) || attempt === retries) break;
    await sleep(500 * (attempt + 1));
  }
  throw lastErr;
}
