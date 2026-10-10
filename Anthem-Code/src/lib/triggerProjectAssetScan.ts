import { supabase } from "@/integrations/supabase/client";
import { parseProjectAssets } from "@/lib/projectAssets";

export type ProjectAssetScanResult = {
  assets: ReturnType<typeof parseProjectAssets>;
  blockedCount: number;
};

/**
 * When the scan Edge Function cannot be reached the browser must NOT declare anything clean: the database
 * strips any client-written verdict anyway. Just report what is stored; the items stay pending and are
 * scanned the next time the function is reachable (the owner saving again triggers it).
 */
async function clientFallbackScan(projectId: string): Promise<ProjectAssetScanResult> {
  const { data: row } = await supabase
    .from("projects")
    .select("project_assets, external_links")
    .eq("id", projectId)
    .maybeSingle();

  const assets = parseProjectAssets(row?.project_assets, row?.external_links);
  return { assets, blockedCount: assets.filter((a) => a.scan_status === "blocked").length };
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
