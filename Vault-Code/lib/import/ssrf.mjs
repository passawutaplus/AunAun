import dns from "node:dns/promises";
import net from "node:net";
import { importError } from "./errors.mjs";

/** Expands any textual IPv6 form into 8 numeric groups, or null if it is not valid IPv6. */
function ipv6Groups(ip) {
  let v = ip.toLowerCase().split("%")[0];
  if (!net.isIPv6(v)) return null;
  const tail = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const [a, b, c, d] = tail[1].split(".").map(Number);
    v = v.slice(0, -tail[1].length) + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16);
  }
  const [head, rest] = v.split("::");
  const h = head ? head.split(":") : [];
  const r = rest === undefined ? [] : rest ? rest.split(":") : [];
  const fill = rest === undefined ? [] : Array(8 - h.length - r.length).fill("0");
  const groups = [...h, ...fill, ...r].map(g => parseInt(g || "0", 16));
  return groups.length === 8 && groups.every(Number.isFinite) ? groups : null;
}

function blockedV4(a, b, c) {
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

/** True for loopback, private, link-local (cloud metadata), CGNAT, multicast, reserved and unparsable addresses. */
export function isBlockedIp(ip) {
  const family = net.isIP(String(ip));
  if (family === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return blockedV4(a, b, c);
  }
  if (family === 6) {
    const g = ipv6Groups(ip);
    if (!g) return true;
    if (g.slice(0, 7).every(x => x === 0) && g[7] <= 1) return true; // :: and ::1
    const mapped = g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff; // ::ffff:a.b.c.d
    const compat = g.slice(0, 6).every(x => x === 0); // ::a.b.c.d (deprecated)
    const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(x => x === 0); // 64:ff9b::/96
    if (mapped || compat || nat64) return blockedV4(g[6] >> 8, g[6] & 255, g[7] >> 8);
    if (g[0] === 0x2002) return blockedV4(g[1] >> 8, g[1] & 255, g[2] >> 8); // 6to4 embeds an IPv4
    return (g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xff00) === 0xff00 || (g[0] === 0x2001 && g[1] === 0x0db8);
  }
  return true;
}

/** Syntax-only check: http(s), no credentials, ports 80/443, no local-looking hostnames. */
export function parsePublicUrl(raw) {
  const text = String(raw || "").trim();
  if (!text || text.length > 2048) throw importError("INVALID_URL", "ลิงก์ไม่ถูกต้อง");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw importError("INVALID_URL", "ลิงก์ไม่ถูกต้อง");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw importError("INVALID_URL", "รองรับเฉพาะลิงก์ http/https");
  if (url.username || url.password) throw importError("UNSAFE_URL", "ลิงก์ที่มีรหัสผ่านฝังอยู่ใช้ไม่ได้");
  if (url.port && url.port !== "80" && url.port !== "443") throw importError("UNSAFE_URL", "พอร์ตนี้ไม่อนุญาต");
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localdomain")) {
    throw importError("UNSAFE_URL", "ลิงก์นี้ไม่อนุญาต");
  }
  if (net.isIP(host) && isBlockedIp(host)) throw importError("UNSAFE_URL", "ลิงก์นี้ไม่อนุญาต");
  return url;
}

/** Resolves the host and rejects when ANY address is non-public. `lookup(host, {all:true})` returns [{address}]. */
export async function assertPublicHost(url, lookup = dns.lookup) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw importError("FETCH_FAILED", "หาเว็บนี้ไม่เจอ");
  if (addresses.some(a => isBlockedIp(a.address))) throw importError("UNSAFE_URL", "ลิงก์นี้ไม่อนุญาต");
  return addresses;
}

/** Full validation used before the first request and before every redirect hop. */
export async function validateUrl(raw, lookup = dns.lookup) {
  const url = parsePublicUrl(raw);
  await assertPublicHost(url, lookup);
  return url;
}
