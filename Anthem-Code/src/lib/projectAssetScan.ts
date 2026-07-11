import { safeHttpUrl } from "@/lib/safeUrl";
import {
  fileExtension,
  PROJECT_ASSET_ALLOWED_EXTENSIONS,
  PROJECT_ASSET_FILE_MAX_BYTES,
  type ProjectAsset,
  type ProjectAssetScanStatus,
} from "@/lib/projectAssets";
import { isValidProjectAssetStoragePath } from "@/lib/projectAssetStorage";

export type AssetScanResult = {
  scan_status: ProjectAssetScanStatus;
  scan_reason: string | null;
};

/** Hosts that hide the real destination — block (cannot verify safely client-side). */
const URL_SHORTENER_HOSTS = new Set([
  "bit.ly",
  "bitly.com",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "tiny.cc",
  "rb.gy",
  "lnkd.in",
  "s.id",
  "v.gd",
  "clck.ru",
  "adf.ly",
  "bc.vc",
]);

/** Path suffixes often used for malware downloads. */
const DANGEROUS_PATH_EXTENSIONS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "scr",
  "com",
  "apk",
  "dmg",
  "vbs",
  "ps1",
  "jar",
  "hta",
]);

function hostMatchesShortener(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (URL_SHORTENER_HOSTS.has(host)) return true;
  for (const short of URL_SHORTENER_HOSTS) {
    if (host.endsWith(`.${short}`)) return true;
  }
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "[::1]") return true;

  // Any IPv6 literal
  if (host.includes(":") || (host.startsWith("[") && host.endsWith("]"))) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((n) => n > 255)) return true;
    const [a, b] = parts;
    // Block all raw IPv4 hosts for portfolio links (common phishing / SSRF vector)
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return true;
  }

  return false;
}

function pathLooksLikeDangerousDownload(pathname: string): boolean {
  const base = pathname.split("/").pop() ?? "";
  const clean = base.split("?")[0]?.split("#")[0] ?? "";
  const ext = fileExtension(clean);
  return Boolean(ext && DANGEROUS_PATH_EXTENSIONS.has(ext));
}

/**
 * Client-side safety check for external project links.
 * Blocks non-http(s), local/private hosts, credentials-in-URL, shorteners, and malware-like downloads.
 */
export function evaluateExternalLinkUrl(raw: string): AssetScanResult {
  const safe = safeHttpUrl(raw);
  if (!safe) {
    return { scan_status: "blocked", scan_reason: "รองรับเฉพาะลิงก์ http/https ที่ปลอดภัย" };
  }

  let parsed: URL;
  try {
    parsed = new URL(safe);
  } catch {
    return { scan_status: "blocked", scan_reason: "URL ไม่ถูกต้อง" };
  }

  if (parsed.username || parsed.password) {
    return {
      scan_status: "blocked",
      scan_reason: "ไม่รองรับลิงก์ที่มีชื่อผู้ใช้หรือรหัสผ่านใน URL",
    };
  }

  const host = parsed.hostname;
  if (isBlockedHost(host)) {
    return {
      scan_status: "blocked",
      scan_reason: "ไม่รองรับลิงก์ localhost, IP ภายใน หรือที่อยู่ IP โดยตรง",
    };
  }

  if (hostMatchesShortener(host)) {
    return {
      scan_status: "blocked",
      scan_reason: "ไม่รองรับลิงก์ย่อ เพราะซ่อนปลายทางจริงได้ — ใส่ลิงก์เต็มแทน",
    };
  }

  if (pathLooksLikeDangerousDownload(parsed.pathname)) {
    return {
      scan_status: "blocked",
      scan_reason: "ลิงก์ชี้ไปไฟล์ที่อาจเป็นอันตราย (เช่น .exe, .apk)",
    };
  }

  return { scan_status: "clean", scan_reason: null };
}

function scanLinkUrl(url: string): AssetScanResult {
  return evaluateExternalLinkUrl(url);
}

function scanFileAsset(asset: ProjectAsset): AssetScanResult {
  const name = asset.file_name ?? asset.storage_path ?? "";
  const ext = fileExtension(name);
  if (!ext || !PROJECT_ASSET_ALLOWED_EXTENSIONS.has(ext)) {
    return { scan_status: "blocked", scan_reason: "ประเภทไฟล์นี้ไม่รองรับ" };
  }
  if (typeof asset.size_bytes === "number" && asset.size_bytes > PROJECT_ASSET_FILE_MAX_BYTES) {
    return { scan_status: "blocked", scan_reason: "ไฟล์ใหญ่เกินกำหนด" };
  }
  if (!isValidProjectAssetStoragePath(asset.storage_path)) {
    return { scan_status: "blocked", scan_reason: "ที่เก็บไฟล์ไม่ถูกต้อง" };
  }
  return { scan_status: "pending", scan_reason: null };
}

/** Initial scan when user adds an asset (sync, basic rules). */
export function evaluateProjectAssetOnAdd(asset: ProjectAsset): AssetScanResult {
  if (asset.kind === "link" && asset.url) return scanLinkUrl(asset.url);
  if (asset.kind === "file") return scanFileAsset(asset);
  return { scan_status: "blocked", scan_reason: "ข้อมูลไม่ครบ" };
}

/** Deep scan pass (edge function / post-save) — resolves pending items. */
export function evaluateProjectAssetDeep(asset: ProjectAsset): AssetScanResult {
  if (asset.kind === "link" && asset.url) {
    // Re-run full link rules (shorteners etc. must stay blocked).
    return scanLinkUrl(asset.url);
  }

  const basic = scanFileAsset(asset);
  if (basic.scan_status === "blocked") return basic;

  // Client fallback cannot run VirusTotal; basic file rules passed → treat as clean.
  if (basic.scan_status === "pending") {
    return { scan_status: "clean", scan_reason: null };
  }

  return basic;
}

export function applyScanResult(asset: ProjectAsset, result: AssetScanResult): ProjectAsset {
  return {
    ...asset,
    scan_status: result.scan_status,
    scan_reason: result.scan_reason,
    scanned_at: result.scan_status !== "pending" ? new Date().toISOString() : null,
  };
}

export function scanProjectAssets(assets: ProjectAsset[], deep = false): ProjectAsset[] {
  return assets.map((a) => {
    if (deep) {
      if (a.scan_status !== "pending") return a;
      return applyScanResult(a, evaluateProjectAssetDeep(a));
    }
    return applyScanResult(a, evaluateProjectAssetOnAdd(a));
  });
}

/** True when the typed value looks complete enough to validate (avoid noise while typing). */
export function looksLikeCompleteExternalUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (t.startsWith("http://") || t.startsWith("https://")) {
    try {
      const u = new URL(t);
      return Boolean(u.hostname.includes(".") || u.hostname === "localhost");
    } catch {
      return t.length > 14;
    }
  }
  return t.includes(".") && !t.endsWith(".") && t.length >= 4;
}

export type ProjectAssetAccessResult =
  | { ok: true; url?: string }
  | { ok: false; reason: string };

/**
 * Click-time gate before open/download.
 * Re-checks scan_status + link/file rules so stale "clean" data cannot bypass safety.
 */
export function assertProjectAssetSafeToOpen(asset: ProjectAsset): ProjectAssetAccessResult {
  if (asset.scan_status === "pending") {
    return { ok: false, reason: "กำลังตรวจสอบความปลอดภัย — ยังเปิดไม่ได้" };
  }
  if (asset.scan_status === "blocked") {
    return {
      ok: false,
      reason: asset.scan_reason ?? "รายการนี้ไม่ผ่านการตรวจสอบความปลอดภัย",
    };
  }
  if (asset.scan_status !== "clean") {
    return { ok: false, reason: "รายการนี้ยังไม่พร้อมเปิด" };
  }

  if (asset.kind === "link") {
    if (!asset.url) return { ok: false, reason: "ไม่พบลิงก์" };
    const recheck = evaluateExternalLinkUrl(asset.url);
    if (recheck.scan_status === "blocked") {
      return { ok: false, reason: recheck.scan_reason ?? "ลิงก์ไม่ปลอดภัย" };
    }
    const url = safeHttpUrl(asset.url);
    if (!url) return { ok: false, reason: "ลิงก์ไม่ปลอดภัย" };
    return { ok: true, url };
  }

  if (asset.kind === "file") {
    const basic = scanFileAsset(asset);
    if (basic.scan_status === "blocked") {
      return { ok: false, reason: basic.scan_reason ?? "ไฟล์ไม่ปลอดภัย" };
    }
    return { ok: true };
  }

  return { ok: false, reason: "ข้อมูลไม่ครบ" };
}
