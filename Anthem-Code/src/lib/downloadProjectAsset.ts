import { supabase } from "@/integrations/supabase/client";
import { safeHttpUrl } from "@/lib/safeUrl";
import type { ProjectAsset } from "@/lib/projectAssets";

const SIGNED_URL_TTL_SEC = 600;

export type ProjectAssetDownloadResult = {
  url: string;
  expires_at: string;
};

/** Resolve a downloadable URL for a clean project asset (signed URL for files). */
export async function fetchProjectAssetDownloadUrl(
  projectId: string,
  asset: ProjectAsset,
): Promise<string | undefined> {
  if (asset.scan_status !== "clean") return undefined;

  if (asset.kind === "link") {
    return safeHttpUrl(asset.url);
  }

  if (asset.kind !== "file" || !asset.storage_path) return undefined;

  const { data, error } = await supabase.functions.invoke("download-project-asset", {
    body: { project_id: projectId, asset_id: asset.id },
  });

  if (error) return undefined;
  const url = (data as ProjectAssetDownloadResult | null)?.url;
  return typeof url === "string" ? url : undefined;
}

export { SIGNED_URL_TTL_SEC };
