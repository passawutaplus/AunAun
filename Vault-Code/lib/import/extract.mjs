/**
 * Pure HTML metadata extraction (no network). Small extractors behind one interface:
 *   (ctx) => partial result, merged in order; first non-empty value wins per field.
 * ctx = { head, html, baseUrl } where baseUrl is the FINAL url after redirects.
 */

const ICON_HINT = /(logo|icon|sprite|pixel|spacer|blank|tracking|badge|avatar|emoji|1x1)/i;

export function decodeEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}

function safeCodePoint(n) {
  return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? "") : "";
}

function metaMap(html) {
  const map = new Map();
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (attr(tag, "property") || attr(tag, "name") || attr(tag, "itemprop")).toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !map.has(key)) map.set(key, content);
  }
  return map;
}

function linkHref(html, relPattern) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (relPattern.test(attr(tag, "rel"))) {
      const href = attr(tag, "href");
      if (href) return href;
    }
  }
  return "";
}

export function resolveHttpUrl(value, base) {
  if (!value || /^(data|javascript|blob):/i.test(value.trim())) return "";
  try {
    const u = new URL(value.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

/** Largest candidate in a srcset ("a.jpg 480w, b.jpg 1200w"). */
function bestSrcset(srcset) {
  let best = "";
  let bestW = -1;
  for (const part of String(srcset || "").split(",")) {
    const [url, size] = part.trim().split(/\s+/);
    if (!url) continue;
    const w = parseFloat(size) || 0;
    if (w > bestW) { best = url; bestW = w; }
  }
  return best;
}

function jsonLdImages(html) {
  const out = [];
  const visit = node => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const type = [].concat(node["@type"] || []).join(" ");
    if (/Article|NewsArticle|BlogPosting|ImageObject|WebPage|Product|CreativeWork/i.test(type) && node.image !== undefined) {
      for (const img of [].concat(node.image)) out.push(typeof img === "string" ? img : img?.url || img?.contentUrl || "");
    }
    if (/ImageObject/i.test(type)) out.push(node.contentUrl || node.url || "");
    if (node["@graph"]) visit(node["@graph"]);
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(m[1].trim())); } catch { /* ignore malformed block */ }
  }
  return out.filter(Boolean);
}

const genericMeta = ({ html, baseUrl }) => {
  const meta = metaMap(html);
  const first = (...keys) => keys.map(k => meta.get(k)).find(Boolean) || "";
  return {
    canonical: resolveHttpUrl(linkHref(html, /\bcanonical\b/i), baseUrl),
    title: first("og:title", "twitter:title") || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]),
    description: first("og:description", "twitter:description", "description"),
    siteName: first("og:site_name"),
    image: resolveHttpUrl(first("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"), baseUrl),
    imageWidth: Number(meta.get("og:image:width")) || null,
    imageHeight: Number(meta.get("og:image:height")) || null,
    favicon: resolveHttpUrl(linkHref(html, /\b(icon|shortcut icon|apple-touch-icon)\b/i), baseUrl),
  };
};

const jsonLdExtractor = ({ html, baseUrl }) => {
  for (const candidate of jsonLdImages(html)) {
    const image = resolveHttpUrl(candidate, baseUrl);
    if (image) return { image };
  }
  return {};
};

const linkImageExtractor = ({ html, baseUrl }) => ({ image: resolveHttpUrl(linkHref(html, /\bimage_src\b/i), baseUrl) });

const imgFallbackExtractor = ({ html, baseUrl }) => {
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const raw = bestSrcset(attr(tag, "srcset") || attr(tag, "data-srcset")) || attr(tag, "data-src") || attr(tag, "data-lazy-src") || attr(tag, "data-original") || attr(tag, "src");
    const image = resolveHttpUrl(raw, baseUrl);
    if (!image || ICON_HINT.test(image) || /\.(svg|gif)(\?|$)/i.test(image)) continue;
    const w = Number(attr(tag, "width")), h = Number(attr(tag, "height"));
    if ((w && w < 120) || (h && h < 120)) continue; // hint only for skipping tiny images, never trusted as the size
    return { image };
  }
  return {};
};

export const EXTRACTORS = [genericMeta, jsonLdExtractor, linkImageExtractor, imgFallbackExtractor];

/** <meta name="pinterest" content="nopin"> in either attribute order. */
export function hasNoPin(html) {
  return /<meta\b[^>]*\bname\s*=\s*["']?pinterest["']?[^>]*\bcontent\s*=\s*["']?nopin\b/i.test(html) || /<meta\b[^>]*\bcontent\s*=\s*["']?nopin["']?[^>]*\bname\s*=\s*["']?pinterest\b/i.test(html);
}

/** Runs the extractor pipeline; the first non-empty value per field wins. */
export function extractMetadata(html, baseUrl, extractors = EXTRACTORS) {
  const text = String(html || "");
  const merged = {};
  for (const run of extractors) {
    const part = run({ html: text, head: text.slice(0, 200_000), baseUrl });
    for (const [key, value] of Object.entries(part)) {
      if (merged[key] === undefined || merged[key] === "" || merged[key] === null) merged[key] = value;
    }
  }
  // The site owner asked not to save its images (Pinterest-style nopin): keep the link, drop every image.
  if (hasNoPin(text)) {
    merged.image = null;
    merged.imageWidth = null;
    merged.imageHeight = null;
    merged.noPin = true;
  }
  // A dimension is only valid together with the og:image it describes.
  if (merged.image && !metaMap(text).get("og:image") && !metaMap(text).get("og:image:url") && !metaMap(text).get("og:image:secure_url")) {
    merged.imageWidth = null;
    merged.imageHeight = null;
  }
  return merged;
}
