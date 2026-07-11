import { supabase } from "@/integrations/supabase/client";
import { assertProjectAssetSafeToOpen } from "@/lib/projectAssetScan";
import type { ProjectAsset } from "@/lib/projectAssets";

const SIGNED_URL_TTL_SEC = 600;

export type ProjectAssetDownloadResult = {
  url: string;
  expires_at: string | null;
  kind?: "link" | "file";
};

export type ProjectAssetResolveResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function edgeErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: unknown }).error;
  return typeof err === "string" ? err : null;
}

function reasonFromEdgeBody(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const body = data as { error?: string; reason?: string };
  if (body.reason && typeof body.reason === "string") return body.reason;
  if (body.error === "pending_scan") return "กำลังตรวจสอบความปลอดภัย — ยังเปิดไม่ได้";
  if (body.error === "blocked") return "ไม่ผ่านการตรวจสอบความปลอดภัย";
  if (body.error === "asset_not_available") return "รายการนี้ไม่พร้อมใช้งาน";
  if (body.error === "forbidden" || body.error === "unauthorized") {
    return "ไม่มีสิทธิ์เปิดรายการนี้";
  }
  return null;
}

/**
 * Click-time resolve: client re-check, then server re-check via download-project-asset.
 * Links return the validated URL; files return a short-lived signed URL.
 */
export async function resolveProjectAssetForOpen(
  projectId: string,
  asset: ProjectAsset,
): Promise<ProjectAssetResolveResult> {
  const gate = assertProjectAssetSafeToOpen(asset);
  if (!gate.ok) return gate;

  const { data, error } = await supabase.functions.invoke("download-project-asset", {
    body: { project_id: projectId, asset_id: asset.id },
  });

  const code = edgeErrorCode(data);
  const edgeReason = reasonFromEdgeBody(data);
  const url = (data as ProjectAssetDownloadResult | null)?.url;

  // Explicit server deny — never open.
  if (code === "blocked" || code === "pending_scan" || code === "forbidden" || code === "unauthorized") {
    return { ok: false, reason: edgeReason ?? "ไม่สามารถเปิดรายการนี้ได้" };
  }

  if (typeof url === "string" && url.length > 0 && !error) {
    if (asset.kind === "link") {
      const again = assertProjectAssetSafeToOpen({ ...asset, url, scan_status: "clean" });
      if (!again.ok || !again.url) {
        return { ok: false, reason: again.ok === false ? again.reason : "ลิงก์ไม่ปลอดภัย" };
      }
      return { ok: true, url: again.url };
    }
    return { ok: true, url };
  }

  // Link fallback when edge is outdated/unavailable — client gate already passed.
  if (asset.kind === "link" && gate.url) {
    return { ok: true, url: gate.url };
  }

  return {
    ok: false,
    reason: edgeReason ?? "ไม่สามารถเปิดรายการนี้ได้",
  };
}

/** @deprecated prefer resolveProjectAssetForOpen — kept for callers expecting a bare URL */
export async function fetchProjectAssetDownloadUrl(
  projectId: string,
  asset: ProjectAsset,
): Promise<string | undefined> {
  const result = await resolveProjectAssetForOpen(projectId, asset);
  return result.ok ? result.url : undefined;
}

export { SIGNED_URL_TTL_SEC };
