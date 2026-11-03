/** Pure helpers for reading a public event page (event-extract). Kept here so they can be unit tested. */
const MAX_TEXT = 15_000;

/** Public http(s) pages only: no credentials, odd ports, localhost or private/link-local addresses. */
export function assertPublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("ลิงก์ไม่ถูกต้อง");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:")
    throw new Error("รองรับเฉพาะลิงก์ http/https");
  if (u.username || u.password) throw new Error("ลิงก์ไม่ถูกต้อง");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("ลิงก์ไม่ถูกต้อง");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".") ||
    /^(127|10|0)\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    host.includes(":"); // IPv6 literals
  if (privateHost) throw new Error("ลิงก์นี้ใช้ไม่ได้");
  return u;
}

export function metaContent(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  );
  return (html.match(re)?.[1] ?? html.match(re2)?.[1] ?? null)?.trim() || null;
}

/** schema.org Event objects from JSON-LD, including ones nested in @graph. */
export function eventJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const types = (Array.isArray(type) ? type : [type]).map((t) => String(t ?? ""));
    if (types.some((t) => /Event$/i.test(t))) out.push(obj);
    if (obj["@graph"]) visit(obj["@graph"]);
  };
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      visit(JSON.parse(m[1]));
    } catch {
      /* broken JSON-LD on the page; ignore */
    }
  }
  return out.slice(0, 3);
}

export function pageText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, MAX_TEXT);
}

export type PageLink = { url: string; text: string };

const ACTION_WORDS =
  /regist|rsvp|ticket|\bbook|apply|application|submit|sign ?up|join|enrol|enroll|ลงทะเบียน|สมัคร|จองบัตร|ซื้อบัตร|บัตร|จอง|ส่งผลงาน|eventbrite|eventpop|ticketmelon|zipevent|forms\.gle|docs\.google\.com\/forms|typeform|tally\.so|ticketmaster|thaiticketmajor|allticket/i;

/**
 * Real http(s) links on the page, resolved against the page URL. Register / ticket / apply links come
 * first so they survive the cap. The AI may only pick from this list: it never writes a link itself.
 */
export function pageLinks(html: string, base: string, max = 80): PageLink[] {
  const seen = new Set<string>();
  const action: PageLink[] = [];
  const other: PageLink[] = [];
  for (const m of html.matchAll(
    /<a\b[^>]*\bhref\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    let url: string;
    try {
      const u = new URL(m[1].replace(/&amp;/g, "&").trim(), base);
      if (u.protocol !== "https:" && u.protocol !== "http:") continue;
      u.hash = "";
      url = u.toString();
    } catch {
      continue;
    }
    if (url.length > 500 || seen.has(url)) continue;
    seen.add(url);
    const text = pageText(m[2]).replace(/\s+/g, " ").slice(0, 80);
    (ACTION_WORDS.test(`${text} ${url}`) ? action : other).push({ url, text });
  }
  return [...action, ...other].slice(0, max);
}

/** Exact match against the page's own links (ignoring a trailing slash), so a made-up URL is dropped. */
export function pickPageLink(value: unknown, links: PageLink[]): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const norm = (s: string) => s.trim().replace(/#.*$/, "").replace(/\/$/, "");
  const want = norm(value);
  return links.find((l) => norm(l.url) === want)?.url ?? null;
}
