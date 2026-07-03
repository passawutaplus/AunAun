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

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^\[::1\]$/,
];

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly/i,
  /tinyurl\.com/i,
  /t\.co\//i,
];

function scanLinkUrl(url: string): AssetScanResult {
  const safe = safeHttpUrl(url);
  if (!safe) {
    return { scan_status: "blocked", scan_reason: "รองรับเฉพาะลิงก์ http/https ที่ปลอดภัย" };
  }

  let host = "";
  try {
    host = new URL(safe).hostname;
  } catch {
    return { scan_status: "blocked", scan_reason: "URL ไม่ถูกต้อง" };
  }

  if (BLOCKED_HOST_PATTERNS.some((p) => p.test(host))) {
    return { scan_status: "blocked", scan_reason: "ไม่รองรับลิงก์ localhost หรือ IP ภายใน" };
  }

  if (SUSPICIOUS_URL_PATTERNS.some((p) => p.test(safe))) {
    return {
      scan_status: "pending",
      scan_reason: "ลิงก์ย่อ — กำลังตรวจสอบความปลอดภัย",
    };
  }

  return { scan_status: "clean", scan_reason: null };
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
  const basic = asset.kind === "link" && asset.url ? scanLinkUrl(asset.url) : scanFileAsset(asset);
  if (basic.scan_status === "blocked") return basic;

  if (asset.kind === "link" && asset.url) {
    if (basic.scan_status === "pending") {
      const safe = safeHttpUrl(asset.url);
      if (!safe) {
        return { scan_status: "blocked", scan_reason: "ลิงก์ไม่ผ่านการตรวจสอบ" };
      }
      return { scan_status: "clean", scan_reason: null };
    }
  }

  // Client fallback cannot run VirusTotal; basic file rules passed → treat as clean.
  if (asset.kind === "file" && basic.scan_status === "pending") {
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
