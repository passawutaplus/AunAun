import { supabase } from "@/integrations/supabase/client";
import { scanProjectAssets } from "@/lib/projectAssetScan";
import {
  parseProjectAssets,
  projectAssetsToExternalLinks,
  toStoredProjectAssets,
} from "@/lib/projectAssets";

export type ProjectAssetScanResult = {
  assets: ReturnType<typeof parseProjectAssets>;
  blockedCount: number;
};

async function clientFallbackScan(projectId: string): Promise<ProjectAssetScanResult> {
  const { data: row } = await supabase
    .from("projects")
    .select("project_assets, external_links")
    .eq("id", projectId)
    .maybeSingle();

  const assets = parseProjectAssets(row?.project_assets, row?.external_links);
  const scanned = scanProjectAssets(assets, true);
  const blockedCount = scanned.filter((a) => a.scan_status === "blocked").length;
  const cleanLinks = projectAssetsToExternalLinks(scanned);

  await supabase
    .from("projects")
    .update({
      project_assets: toStoredProjectAssets(scanned),
      external_links: cleanLinks,
    })
    .eq("id", projectId);

  return { assets: scanned, blockedCount };
}

/** Run deep scan (Edge Function or client fallback). */
export async function triggerProjectAssetScan(
  projectId: string,
): Promise<ProjectAssetScanResult> {
  const { data, error } = await supabase.functions.invoke("scan-project-assets", {
    body: { project_id: projectId },
  });

  const bodyError = (data as { error?: string } | null)?.error;
  if (error || bodyError) {
    return clientFallbackScan(projectId);
  }

  const assets = parseProjectAssets(
    (data as { project_assets?: unknown } | null)?.project_assets,
  );
  const blockedCount = assets.filter((a) => a.scan_status === "blocked").length;
  return { assets, blockedCount };
}

/** Fire-and-forget scan — does not block save/publish UI. */
export function enqueueProjectAssetScan(
  projectId: string,
  onComplete?: (result: ProjectAssetScanResult) => void,
): void {
  void triggerProjectAssetScan(projectId)
    .then((result) => onComplete?.(result))
    .catch(() => {
      void clientFallbackScan(projectId).then((result) => onComplete?.(result));
    });
}
