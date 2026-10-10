import { safeHttpUrl } from "@/lib/safeUrl";
import type { StoredProjectExternalLink } from "@/lib/projectExternalLinks";

export type ProjectAssetScanStatus = "pending" | "clean" | "blocked";

export type ProjectAssetKind = "link" | "file";

export type ProjectAsset = {
  id: string;
  kind: ProjectAssetKind;
  label: string;
  /** http(s) URL — links only */
  url?: string;
  /** Storage path — files only (private bucket; use download-project-asset Edge Function). */
  storage_path?: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  scan_status: ProjectAssetScanStatus;
  scan_reason?: string | null;
  scanned_at?: string | null;
};

export type StoredProjectAsset = Omit<ProjectAsset, "id"> & { id?: string };

export const PROJECT_ASSETS_MAX = 10;

export const PROJECT_ASSET_FILE_MAX_BYTES = 25 * 1024 * 1024;

/** Allowed downloadable file extensions (lowercase, without dot). */
export const PROJECT_ASSET_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "zip",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "ttf",
  "otf",
  "woff",
  "woff2",
]);

function newAssetId(): string {
  return crypto.randomUUID();
}

export function createProjectLinkAsset(label: string, url: string): ProjectAsset {
  return {
    id: newAssetId(),
    kind: "link",
    label,
    url,
    scan_status: "pending",
    scan_reason: null,
    scanned_at: null,
  };
}

export function createProjectFileAsset(input: {
  label: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}): ProjectAsset {
  return {
    id: newAssetId(),
    kind: "file",
    label: input.label,
    storage_path: input.storage_path,
    file_name: input.file_name,
    mime_type: input.mime_type,
    size_bytes: input.size_bytes,
    scan_status: "pending",
    scan_reason: null,
    scanned_at: null,
  };
}

function normalizeStoredAsset(raw: Record<string, unknown>): ProjectAsset | null {
  const kind = raw.kind === "file" ? "file" : raw.kind === "link" ? "link" : null;
  if (!kind) return null;

  const scan_status: ProjectAssetScanStatus =
    raw.scan_status === "clean" || raw.scan_status === "blocked" || raw.scan_status === "pending"
      ? raw.scan_status
      : "pending";

  const label = String(raw.label ?? "").trim();
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newAssetId();

  if (kind === "link") {
    const url = String(raw.url ?? "").trim();
    if (!url) return null;
    return {
      id,
      kind: "link",
      label: label || url,
      url,
      scan_status,
      scan_reason: raw.scan_reason != null ? String(raw.scan_reason) : null,
      scanned_at: typeof raw.scanned_at === "string" ? raw.scanned_at : null,
    };
  }

  const storage_path = String(raw.storage_path ?? "").trim();
  if (!storage_path) return null;
  return {
    id,
    kind: "file",
    label: label || String(raw.file_name ?? "ไฟล์แนบ"),
    storage_path,
    file_name: String(raw.file_name ?? "").trim() || undefined,
    mime_type: String(raw.mime_type ?? "").trim() || undefined,
    size_bytes: typeof raw.size_bytes === "number" ? raw.size_bytes : undefined,
    scan_status,
    scan_reason: raw.scan_reason != null ? String(raw.scan_reason) : null,
    scanned_at: typeof raw.scanned_at === "string" ? raw.scanned_at : null,
  };
}

/** Parse DB jsonb; merges legacy external_links when project_assets is empty. */
export function parseProjectAssets(
  raw: unknown,
  legacyExternalLinks?: unknown,
): ProjectAsset[] {
  const out: ProjectAsset[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const asset = normalizeStoredAsset(item as Record<string, unknown>);
      if (asset) out.push(asset);
      if (out.length >= PROJECT_ASSETS_MAX) return out;
    }
  }

  if (out.length > 0) return out;

  if (!Array.isArray(legacyExternalLinks)) return [];
  for (const item of legacyExternalLinks) {
    if (!item || typeof item !== "object") continue;
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const url = String((item as { url?: unknown }).url ?? "").trim();
    if (!url) continue;
    out.push({
      id: newAssetId(),
      kind: "link",
      label: label || url,
      url,
      scan_status: "clean",
      scan_reason: null,
      scanned_at: null,
    });
    if (out.length >= PROJECT_ASSETS_MAX) break;
  }
  return out;
}

export function toStoredProjectAssets(assets: ProjectAsset[]): StoredProjectAsset[] {
  return assets.slice(0, PROJECT_ASSETS_MAX).map((a) => {
    const base = {
      id: a.id,
      kind: a.kind,
      label: a.label.trim(),
      scan_status: a.scan_status,
      scan_reason: a.scan_reason ?? null,
      scanned_at: a.scanned_at ?? null,
    };
    if (a.kind === "link") {
      return { ...base, url: a.url?.trim() ?? "" };
    }
    return {
      ...base,
      storage_path: a.storage_path?.trim() ?? "",
      file_name: a.file_name?.trim(),
      mime_type: a.mime_type?.trim(),
      size_bytes: a.size_bytes,
    };
  });
}

/** Legacy sync — clean links only, for backward-compatible consumers. */
export function projectAssetsToExternalLinks(assets: ProjectAsset[]): StoredProjectExternalLink[] {
  return assets
    .filter((a) => a.kind === "link" && a.scan_status === "clean" && a.url)
    .map((a) => ({ label: a.label.trim(), url: a.url!.trim() }))
    .filter((l) => l.url.length > 0);
}

/** Public visitors — only assets that passed scan. */
export function filterPublicProjectAssets(assets: ProjectAsset[]): ProjectAsset[] {
  return assets.filter((a) => a.scan_status === "clean");
}

export function hasPendingProjectAssets(assets: ProjectAsset[]): boolean {
  return assets.some((a) => a.scan_status === "pending");
}

export function projectAssetDownloadUrl(asset: ProjectAsset): string | undefined {
  if (asset.kind === "link") return safeHttpUrl(asset.url);
  return undefined;
}

export function fileExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const idx = base.lastIndexOf(".");
  if (idx < 0) return "";
  return base.slice(idx + 1).toLowerCase();
}

/** Leading bytes each allowed type must start with (client-side sanity check; the server scan stays authoritative). */
const FILE_SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  ttf: (b) => (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) || (b[0] === 0x74 && b[1] === 0x72),
  otf: (b) => b[0] === 0x4f && b[1] === 0x54 && b[2] === 0x54 && b[3] === 0x4f,
  woff: (b) => b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x46,
  woff2: (b) => b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32,
};

/** True when the file's first bytes match its extension (e.g. an .exe renamed to .pdf fails). */
export async function fileSignatureMatchesExtension(file: File): Promise<boolean> {
  const check = FILE_SIGNATURES[fileExtension(file.name)];
  if (!check) return false;
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    return check(head);
  } catch {
    return false;
  }
}

export function isAllowedProjectAssetFile(file: File): boolean {
  const ext = fileExtension(file.name);
  if (!ext || !PROJECT_ASSET_ALLOWED_EXTENSIONS.has(ext)) return false;
  if (file.size > PROJECT_ASSET_FILE_MAX_BYTES) return false;
  return true;
}
