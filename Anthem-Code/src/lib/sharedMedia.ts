/**
 * Images shared into SAMECOR from the Android share sheet.
 * public/sw.js stores them in this cache on POST /share-target, then redirects to
 * /portfolio/new?shared=1 — the editor calls takeSharedMedia() once to pull them in.
 */
const SHARE_CACHE = "samecor-share-target";

/** Reads and clears the shared images. Returns [] when there is nothing (or no Cache API). */
export async function takeSharedMedia(): Promise<File[]> {
  if (typeof caches === "undefined") return [];
  try {
    const cache = await caches.open(SHARE_CACHE);
    const requests = await cache.keys();
    const files = await Promise.all(
      requests.map(async (request, index) => {
        const response = await cache.match(request);
        if (!response) return null;
        const blob = await response.blob();
        const name = decodeURIComponent(response.headers.get("x-file-name") ?? `shared-${index}`);
        return new File([blob], name, { type: blob.type || response.headers.get("content-type") || "" });
      }),
    );
    await caches.delete(SHARE_CACHE);
    return files.filter((file): file is File => file !== null && file.size > 0);
  } catch {
    return [];
  }
}
