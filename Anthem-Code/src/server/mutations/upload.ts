import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/core/subscription";
import { LEGAL_ATTESTATION_VERSION } from "@/lib/legalConfig";
import { isGifFile, uploadProjectGif } from "@/lib/uploadProjectGif";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideoWithPoster } from "@/lib/uploadVideo";
import type { UploadStageReporter } from "@/lib/uploadProgress";

/** Mock Upload: "JPG · PNG · GIF · MP4 · ≤ 20 MB" per file. The storage quota of the plan still applies. */
export const WORK_FILE_MAX_BYTES = 20 * 1024 * 1024;

export type UploadedWorkFile = { kind: "image" | "video"; url: string; poster?: string };

/**
 * One picture or video of a work into `project-media` (the old editor's pipeline: HEIC → JPEG,
 * compression, quota check). Large GIFs come back as a looping video.
 */
export async function uploadWorkFile(
  file: File,
  userId: string,
  folder: string,
  tier: Tier,
  reporter: UploadStageReporter,
  signal: AbortSignal,
): Promise<UploadedWorkFile> {
  if (file.type.startsWith("video/")) {
    const v = await uploadProjectVideoWithPoster(file, userId, folder, tier, reporter, signal);
    return { kind: "video", url: v.url, ...(v.posterUrl ? { poster: v.posterUrl } : {}) };
  }
  if (isGifFile(file)) {
    const g = await uploadProjectGif(file, userId, folder, tier, reporter, signal);
    return { kind: g.isVideo ? "video" : "image", url: g.url };
  }
  const url = await uploadProjectImage(file, userId, folder, tier, { reporter, signal, fastQuotaCheck: true });
  return { kind: "image", url };
}

/** Columns this editor writes; everything else on the row (tools, licence, …) stays as it is. */
export type WorkWrite = {
  title: string;
  description: string;
  sc_category: string | null;
  category: string | null;
  tags: string[];
  content_blocks: unknown[];
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  media_sizes: Record<string, [number, number]>;
  gallery_urls: string[];
  video_urls: string[];
  status: "Draft" | "Published" | "Private";
};

/**
 * Insert (first save) or update one of my works. The id is made on the page so uploads can use it as
 * their folder before the row exists. `attest` records the rights checkbox of the Publish dialog.
 */
export async function saveWork(id: string, ownerId: string, fields: WorkWrite, opts: { insert: boolean; attest?: boolean }): Promise<void> {
  const row: Record<string, unknown> = { ...fields };
  if (opts.attest) {
    row.rights_attested_at = new Date().toISOString();
    row.rights_attestation_version = LEGAL_ATTESTATION_VERSION;
  }
  // The redesign columns are not in the generated types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = supabase.from("projects") as any;
  const { error } = opts.insert
    ? await projects.insert({ id, owner_id: ownerId, ...row })
    : await projects.update(row).eq("id", id).eq("owner_id", ownerId);
  if (error) throw error;
}

/** The catalog (project_series) a work is in; a work is in one catalog at most. */
export async function getWorkCatalogId(workId: string): Promise<string | null> {
  const { data, error } = await supabase.from("project_series_items").select("series_id").eq("project_id", workId).limit(1).maybeSingle();
  if (error) throw error;
  return (data?.series_id as string | undefined) ?? null;
}

/** Puts a work into one of my catalogs (last place), or takes it out with `null`. */
export async function setWorkCatalog(workId: string, catalogId: string | null): Promise<void> {
  const current = await getWorkCatalogId(workId);
  if (current === catalogId) return;
  if (current) {
    const { error } = await supabase.from("project_series_items").delete().eq("project_id", workId);
    if (error) throw error;
  }
  if (!catalogId) return;
  const { data: last, error: lErr } = await supabase
    .from("project_series_items")
    .select("position")
    .eq("series_id", catalogId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lErr) throw lErr;
  const { error } = await supabase
    .from("project_series_items")
    .insert({ series_id: catalogId, project_id: workId, position: ((last?.position as number | undefined) ?? -1) + 1 });
  if (error) throw error;
}
