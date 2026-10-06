import { importError } from "./errors.mjs";
import { extractMetadata, resolveHttpUrl } from "./extract.mjs";
import { probeImageSize } from "./image-probe.mjs";
import { safeFetch } from "./safe-fetch.mjs";
import { parsePublicUrl } from "./ssrf.mjs";

const HTML_RE = /^(text\/html|application\/xhtml\+xml)$/;
const IMAGE_RE = /^image\/(png|jpe?g|gif|webp|avif|svg\+xml)$/;
const PROBE_BYTES = 64 * 1024;

const hostOf = href => {
  try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return ""; }
};

async function probeRemoteImage(imageUrl, opts) {
  try {
    const res = await safeFetch(imageUrl, { ...opts, maxBytes: PROBE_BYTES, timeoutMs: 4000, accept: t => IMAGE_RE.test(t), acceptHeader: "image/*" });
    return res.body ? probeImageSize(res.body) : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a user-supplied URL safely and returns the import payload.
 * Only an invalid or unsafe URL throws; blocked pages, timeouts and missing images degrade to a partial result.
 * `opts` forwards test hooks (lookup, requestImpl) to safeFetch.
 */
export async function importUrl(rawUrl, opts = {}) {
  const start = parsePublicUrl(rawUrl); // INVALID_URL / UNSAFE_URL before any network
  let page;
  try {
    page = await safeFetch(start.href, { ...opts, acceptHeader: "text/html,application/xhtml+xml;q=0.9,image/*;q=0.8,*/*;q=0.5", accept: t => HTML_RE.test(t) || IMAGE_RE.test(t) });
  } catch (error) {
    if (error.code === "UNSAFE_URL" || error.code === "INVALID_URL") throw error;
    page = null;
  }
  const finalUrl = page?.finalUrl || start.href;
  const domain = hostOf(finalUrl) || hostOf(start.href);
  const base = { url: start.href, canonicalUrl: finalUrl, title: domain, description: "", imageUrl: null, imageWidth: null, imageHeight: null, domain, siteName: domain, faviconUrl: null, contentType: "webpage" };

  if (!page || !page.body) return base; // blocked / non-200 / timeout / unsupported type: keep the link only

  if (IMAGE_RE.test(page.contentType)) {
    const size = probeImageSize(page.body);
    return { ...base, title: decodeURIComponent(new URL(finalUrl).pathname.split("/").pop() || domain), imageUrl: finalUrl, imageWidth: size?.width ?? null, imageHeight: size?.height ?? null, contentType: "image" };
  }

  const meta = extractMetadata(page.body.toString("utf8"), finalUrl);
  const imageUrl = meta.image || null;
  let { imageWidth, imageHeight } = meta;
  if (imageUrl && !(imageWidth && imageHeight)) {
    const size = await probeRemoteImage(imageUrl, opts);
    imageWidth = size?.width ?? null;
    imageHeight = size?.height ?? null;
  }
  const favicon = meta.favicon || resolveHttpUrl("/favicon.ico", finalUrl) || null;
  return {
    ...base,
    canonicalUrl: meta.canonical || finalUrl,
    title: (meta.title || domain).slice(0, 300),
    description: (meta.description || "").slice(0, 600),
    siteName: (meta.siteName || domain).slice(0, 120),
    imageUrl,
    imageWidth: imageUrl ? imageWidth || null : null,
    imageHeight: imageUrl ? imageHeight || null : null,
    images: Array.isArray(meta.images) ? meta.images.slice(0, 24) : [],
    faviconUrl: favicon,
  };
}

export { importError };
