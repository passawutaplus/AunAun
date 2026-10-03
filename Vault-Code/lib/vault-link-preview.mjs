import dns from "node:dns/promises";
import net from "node:net";

const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = "AplusVaultLinkPreview/0.1 (+https://aplus-vault.vercel.app; user-requested page preview)";

export function previewError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** True for loopback, private, link-local (incl. cloud metadata), CGNAT, multicast and reserved ranges. */
export function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (family === 6) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
  }
  return true;
}

/** http(s) only, no credentials, no odd ports, and every resolved address must be public. */
export async function assertPublicUrl(raw, lookup = dns.lookup) {
  let url;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    throw previewError("Enter a valid link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw previewError("Only http(s) links can be previewed.");
  if (url.username || url.password) throw previewError("Links with credentials are not allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") throw previewError("This port is not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw previewError("This host is not allowed.");
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw previewError("Could not resolve this link.", 422);
  if (addresses.some(a => isBlockedIp(a.address))) throw previewError("This host is not allowed.");
  return url;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/\s+/g, " ").trim();
}

function metaContent(html, keys) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const name = (tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!name || !keys.includes(name.toLowerCase())) continue;
    const content = (tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || tag.match(/\bcontent\s*=\s*'([^']*)'/i) || [])[1];
    if (content) return decodeEntities(content);
  }
  return "";
}

/** Pulls title, site name, description and a thumbnail URL out of an HTML head. Pure, no network. */
export function parsePreview(html, pageUrl) {
  const head = String(html || "").slice(0, MAX_HTML_BYTES);
  const title = metaContent(head, ["og:title", "twitter:title"]) || decodeEntities((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const siteName = metaContent(head, ["og:site_name"]);
  const description = metaContent(head, ["og:description", "twitter:description", "description"]);
  let image = metaContent(head, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
  if (image) {
    try {
      const resolved = new URL(image, pageUrl);
      image = resolved.protocol === "https:" ? resolved.href : "";
    } catch {
      image = "";
    }
  }
  return {
    title: title.slice(0, 200),
    siteName: siteName.slice(0, 100),
    description: description.slice(0, 300),
    image: image.slice(0, 1000),
  };
}

async function readLimited(response, limit) {
  const reader = response.body?.getReader?.();
  if (!reader) return (await response.text()).slice(0, limit);
  const chunks = [];
  let size = 0;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    chunks.push(value);
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Fetches one page the user pasted (like their browser would) and returns preview metadata.
 * Redirects are followed manually so every hop is re-checked against the public-address rule.
 * The image itself is never downloaded here; the client shows the remote thumbnail.
 */
export async function fetchLinkPreview(rawUrl, { fetchImpl = fetch, lookup = dns.lookup } = {}) {
  let url = await assertPublicUrl(rawUrl, lookup);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetchImpl(url.href, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    }).catch(() => {
      throw previewError("The site did not respond.", 502);
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      url = await assertPublicUrl(new URL(response.headers.get("location"), url).href, lookup);
      continue;
    }
    if (!response.ok) throw previewError(`The site answered ${response.status}.`, 502);
    if (!/text\/html|application\/xhtml/i.test(response.headers.get("content-type") || "")) {
      return { url: url.href, title: "", siteName: "", description: "", image: "" };
    }
    return { url: url.href, ...parsePreview(await readLimited(response, MAX_HTML_BYTES), url.href) };
  }
  throw previewError("Too many redirects.", 502);
}
