import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";

/** Below this the SDK upload is instant enough that a progress bar adds nothing. */
const XHR_MIN_BYTES = 1.5 * 1024 * 1024;

type XhrError = Error & { status?: number };

/**
 * Same request the SDK makes (POST /storage/v1/object/<bucket>/<path>) but through XHR, so the browser
 * reports bytes sent and an AbortSignal really cancels the transfer. Returns null when it cannot be
 * set up (no session / unknown URL) so the caller falls back to the SDK.
 */
async function uploadWithProgress(
  path: string,
  body: Blob | File,
  contentType: string,
  signal: AbortSignal | undefined,
  onProgress: (pct: number) => void,
): Promise<{ error: XhrError | null } | null> {
  const { data: sess } = await sharedStorage.auth.getSession();
  const token = sess.session?.access_token;
  const apiKey = (sharedStorage as unknown as { supabaseKey?: string }).supabaseKey;
  const publicUrl = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl("x").data.publicUrl;
  const base = publicUrl.split("/object/public/")[0];
  if (!token || !apiKey || !base || !base.includes("/storage/v1")) return null;

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${base}/object/${SHARED_MEDIA_BUCKET}/${encodedPath}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const done = () => signal?.removeEventListener("abort", onAbort);

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", new Blob([body], { type: contentType }));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ error: null });
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const j = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = j.message ?? j.error ?? message;
      } catch {
        /* keep default */
      }
      const err: XhrError = Object.assign(new Error(message), { status: xhr.status });
      resolve({ error: err });
    };
    xhr.onerror = () => {
      done();
      resolve({ error: Object.assign(new Error("Failed to fetch"), { status: undefined }) });
    };
    xhr.onabort = () => {
      done();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    xhr.send(form);
  });
}

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
  signal?: AbortSignal,
  onProgress?: (pct: number) => void,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Upload cancelled", "AbortError");
    }
    let result: { error: unknown } | null = null;
    if (onProgress && body.size >= XHR_MIN_BYTES) {
      result = await uploadWithProgress(path, body, contentType, signal, onProgress);
    }
    if (!result) {
      result = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, body, { contentType, upsert: false });
    }
    const { error } = result;
    if (!error) return;
    lastErr = error;
    if (!isRetryable(error) || attempt === retries) break;
    await sleep(500 * (attempt + 1));
  }
  throw lastErr;
}
