import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sharedDb } from "./ecosystem-db.ts";

/** Same lookup as anthem-email-html.ts, kept local so the scan functions do not bundle the whole email template file. */
function anthemSiteUrl(): string {
  return (
    Deno.env.get("APLUS1_APP_URL") ??
    Deno.env.get("ANTHEM_APP_URL") ??
    "https://aplus1.app"
  ).replace(/\/$/, "");
}

export type ScanAsset = {
  id?: string;
  kind: "link" | "file";
  label: string;
  url?: string;
  storage_path?: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  scan_status: "pending" | "clean" | "blocked";
  scan_reason?: string | null;
  scanned_at?: string | null;
  /** Set only by the scan function (service role); the database strips it from client writes. */
  server_scanned_at?: string | null;
  scan_engine?: string;
};

export function resolveAssetStorage(storagePath: string): { bucket: string; path: string } {
  if (storagePath.startsWith("anthem/")) {
    return { bucket: "project-media", path: storagePath };
  }
  return { bucket: "project-assets", path: storagePath };
}

export async function deleteBlockedAssetFile(
  admin: SupabaseClient,
  asset: ScanAsset,
): Promise<void> {
  if (asset.kind !== "file" || !asset.storage_path) return;
  const { bucket, path } = resolveAssetStorage(asset.storage_path);
  await admin.storage.from(bucket).remove([path]);
}

export async function notifyProjectAssetScan(
  admin: SupabaseClient,
  opts: {
    ownerId: string;
    projectId: string;
    asset: ScanAsset;
    previousStatus: string;
  },
): Promise<void> {
  const { ownerId, projectId, asset, previousStatus } = opts;
  if (asset.scan_status === previousStatus) return;
  if (asset.scan_status === "pending") return;

  const site = anthemSiteUrl();
  const isClean = asset.scan_status === "clean";
  const title = isClean ? "ไฟล์แนบผ่านการตรวจสอบ" : "ไฟล์แนบไม่ผ่านการตรวจสอบ";
  const body = isClean
    ? `"${asset.label}" พร้อมให้คนอื่นดูแล้ว`
    : `"${asset.label}": ${asset.scan_reason ?? "ไม่ปลอดภัย"}`;
  const link = isClean
    ? `${site}/project/${projectId}`
    : `${site}/portfolio/${projectId}/edit`;

  const idempotencyKey = `asset-scan:${projectId}:${asset.id}:${asset.scan_status}`;

  const notifications = sharedDb(admin).from("notifications");
  const { data: existing } = await notifications
    .select("id")
    .eq("user_id", ownerId)
    .contains("metadata", { idempotency_key: idempotencyKey })
    .maybeSingle();

  if (existing?.id) return;

  await notifications.insert({
    user_id: ownerId,
    app: "anthem",
    kind: isClean ? "asset_scan_clean" : "asset_scan_blocked",
    title,
    body,
    link,
    metadata: {
      project_id: projectId,
      asset_id: asset.id,
      asset_kind: asset.kind,
      idempotency_key: idempotencyKey,
    },
  });
}
