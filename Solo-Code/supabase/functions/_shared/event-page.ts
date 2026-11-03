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

/** Max redirect hops event-extract follows; every hop is re-checked with assertPublicUrl + assertPublicAddress. */
export const MAX_REDIRECTS = 4;

function ipv4ToInt(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** Expand an IPv6 literal to 8 groups (lower-case hex), or null when malformed. */
function ipv6Groups(ip: string): string[] | null {
  let s = ip
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/%.*$/, "");
  // Embedded IPv4 tail (::ffff:1.2.3.4) → two hex groups.
  const v4 = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    if (n === null) return null;
    s = s.slice(0, -v4[1].length) + (n >>> 16).toString(16) + ":" + (n & 0xffff).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array(fill).fill("0"), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0"));
}

/**
 * True for any address a public web page must never resolve to: loopback, RFC1918, link-local
 * (incl. the 169.254.169.254 cloud metadata service), CGNAT, multicast, unspecified, IPv6 ULA and
 * IPv4-mapped/6to4/Teredo forms of the same ranges. Unparseable input counts as private.
 */
export function isPrivateIp(ip: string): boolean {
  const v4 = ipv4ToInt(ip);
  if (v4 !== null) {
    const a = v4 >>> 24;
    const b = (v4 >>> 16) & 0xff;
    return (
      a === 0 || // 0.0.0.0/8 "this network"
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
      (a === 169 && b === 254) || // link-local + cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && ((v4 >>> 8) & 0xff) === 0) || // 192.0.0.0/24 IETF protocol assignments
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224 // multicast + reserved + broadcast
    );
  }
  const g = ipv6Groups(ip);
  if (!g) return true;
  const n0 = parseInt(g[0], 16);
  const joined = g.join(":");
  if (joined === "0000:0000:0000:0000:0000:0000:0000:0000") return true; // ::
  if (joined === "0000:0000:0000:0000:0000:0000:0000:0001") return true; // ::1
  if (g.slice(0, 5).every((x) => x === "0000") && (g[5] === "ffff" || g[5] === "0000")) {
    // ::ffff:a.b.c.d (IPv4-mapped) and ::a.b.c.d (IPv4-compatible): judge the embedded IPv4.
    const embedded = (parseInt(g[6], 16) << 16) | parseInt(g[7], 16);
    return isPrivateIp(
      [embedded >>> 24, (embedded >>> 16) & 0xff, (embedded >>> 8) & 0xff, embedded & 0xff].join(
        ".",
      ),
    );
  }
  if (g[0] === "0064" && g[1] === "ff9b") return true; // 64:ff9b::/96 NAT64 — never a public web host
  if (g[0] === "2002") {
    // 6to4: 2002:AABB:CCDD:: embeds IPv4 AA.BB.CC.DD
    const a = parseInt(g[1], 16);
    const b = parseInt(g[2], 16);
    return isPrivateIp([a >>> 8, a & 0xff, b >>> 8, b & 0xff].join("."));
  }
  if (g[0] === "2001" && g[1] === "0000") return true; // Teredo
  if ((n0 & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((n0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((n0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

export type HostResolver = (hostname: string) => Promise<string[]>;

/** Deno.resolveDns for A and AAAA; a missing/empty answer is treated as "cannot verify" → reject. */
export const denoResolver: HostResolver = async (hostname) => {
  const dns = (
    globalThis as { Deno?: { resolveDns?: (h: string, t: "A" | "AAAA") => Promise<string[]> } }
  ).Deno?.resolveDns;
  if (!dns) throw new Error("dns_unavailable");
  const settle = (t: "A" | "AAAA") => dns(hostname, t).catch(() => [] as string[]);
  const [a, aaaa] = await Promise.all([settle("A"), settle("AAAA")]);
  return [...a, ...aaaa];
};

/**
 * SSRF guard, second half: resolve the hostname and refuse when *any* answer is a private,
 * loopback, link-local or metadata address (a hostname with mixed answers is treated as hostile).
 * Rejects names that do not resolve at all. Use after assertPublicUrl on the start URL and on every redirect.
 */
export async function assertPublicAddress(
  u: URL,
  resolve: HostResolver = denoResolver,
): Promise<URL> {
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isPrivateIp(host) && (ipv4ToInt(host) !== null || host.includes(":"))) {
    throw new Error("ลิงก์นี้ใช้ไม่ได้");
  }
  if (ipv4ToInt(host) !== null) return u; // public IPv4 literal: nothing to resolve
  let addrs: string[];
  try {
    addrs = await resolve(host);
  } catch {
    throw new Error("เปิดหน้านี้ไม่ได้");
  }
  if (!addrs.length) throw new Error("เปิดหน้านี้ไม่ได้");
  if (addrs.some((ip) => isPrivateIp(ip))) throw new Error("ลิงก์นี้ใช้ไม่ได้");
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
