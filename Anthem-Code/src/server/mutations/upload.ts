import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/core/subscription";
import { compressCommunityVideo } from "@/lib/compressCommunityVideo";
import { abortable } from "@/lib/ffmpegCore";
import { fetchTaggedUserSummaries, type TaggedUserSummary } from "@/lib/communityTaggedUsers";
import { LEGAL_ATTESTATION_VERSION } from "@/lib/legalConfig";
import { cancelProjectCollabInvite, fetchProjectCollabInvites, syncProjectCollabInvites } from "@/lib/portfolioCollabInvites";
import { createProjectFileAsset, type ProjectAsset } from "@/lib/projectAssets";
import { applyScanResult, evaluateProjectAssetOnAdd } from "@/lib/projectAssetScan";
import { enqueueProjectAssetScan } from "@/lib/triggerProjectAssetScan";
import { uploadProjectAssetFile } from "@/lib/uploadProjectAsset";
import { uploadAnthemMedia } from "@/lib/sharedMediaUpload";
import { isSchemaMismatchError } from "@/lib/supabaseErrors";
import { isGifFile, uploadProjectGif } from "@/lib/uploadProjectGif";
import { uploadProjectImage } from "@/lib/uploadImage";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";
import { isVideoFile } from "@/lib/videoAccept";
import { extractVideoPosterFile } from "@/lib/videoPoster";
import { setCatalogWork } from "./studio";

/**
 * Mock Upload: "≤ 20 MB" per file — the file that is stored, after compression (owner rule), so an
 * iPhone MOV that shrinks under it goes up. The storage quota of the plan still applies.
 */
export const WORK_FILE_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_TOO_BIG = "ย่อแล้วยังเกิน 20 MB ลองตัดคลิปให้สั้นลงนะ";

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
  if (isVideoFile(file)) return uploadWorkVideo(file, userId, folder, tier, reporter, signal);
  if (isGifFile(file)) {
    const g = await uploadProjectGif(file, userId, folder, tier, reporter, signal);
    return { kind: g.isVideo ? "video" : "image", url: g.url };
  }
  const url = await uploadProjectImage(file, userId, folder, tier, { reporter, signal, fastQuotaCheck: true });
  return { kind: "image", url };
}

/**
 * Any video the old editor takes (MP4, MOV, WebM…) → H.264 MP4 (lib/uploadVideo's steps), then the 20 MB rule on
 * the compressed file. The poster is the first frame, as the old editor.
 */
async function uploadWorkVideo(
  file: File,
  userId: string,
  folder: string,
  tier: Tier,
  reporter: UploadStageReporter,
  signal: AbortSignal,
): Promise<UploadedWorkFile> {
  const posterFile = extractVideoPosterFile(file).catch(() => null);
  const prepared = await abortable(compressCommunityVideo(file, reporter), signal, true);
  if (prepared.size > WORK_FILE_MAX_BYTES) throw new Error(VIDEO_TOO_BIG);
  const url = await uploadAnthemMedia({
    file: prepared,
    ext: "mp4",
    contentType: "video/mp4",
    userId,
    folder,
    tier,
    stage: UPLOAD_STAGE.uploadingVideo,
    reporter,
    signal,
  });
  const poster = await posterFile;
  if (!poster || signal.aborted) return { kind: "video", url };
  try {
    const posterUrl = await uploadProjectImage(poster, userId, folder, tier, { skipCompression: true, fastQuotaCheck: true, signal });
    return { kind: "video", url, poster: posterUrl };
  } catch {
    return { kind: "video", url };
  }
}

/** Columns this editor writes; everything else on the row (price, hire, credits, …) stays as it is. */
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
  /** Upload YEAR / ASK VIEWERS (migration 20261129110000). */
  made_year?: number | null;
  ask_viewers?: string | null;
  /** TOOLS, LICENSE, AI — the old editor's columns, written the same way. */
  tools: string[];
  license_type: string;
  license_note: string;
  ai_assisted: boolean;
  ai_disclosure_note: string;
  /** FILES & LINKS, as the old ProjectAssetsEditor. */
  project_assets: unknown[];
  external_links: unknown[];
};

/**
 * Insert (first save) or update a work. The id is made on the page so uploads can use it as their folder
 * before the row exists. `ownerId` is the row's owner (an admin may edit someone's work, as in the old
 * editor; RLS projects_update allows it). `attest` records the rights checkbox of the Publish dialog.
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
  const write = (r: Record<string, unknown>) =>
    opts.insert ? projects.insert({ id, owner_id: ownerId, ...r }) : projects.update(r).eq("id", id).eq("owner_id", ownerId);
  let { error } = await write(row);
  // Before migration 20261129110000 the YEAR / ASK VIEWERS columns do not exist: save the rest.
  if (error && isSchemaMismatchError(error) && ("made_year" in row || "ask_viewers" in row)) {
    const { made_year: _y, ask_viewers: _a, ...rest } = row;
    ({ error } = await write(rest));
  }
  if (error) throw error;
}

/** Upload's fields that `getWork` does not read (licence terms, AI disclosure, attachments, credited people). */
export type WorkEditExtras = {
  license_note: string | null;
  ai_assisted: boolean | null;
  ai_disclosure_note: string | null;
  project_assets: unknown;
  external_links: unknown;
  collab_user_ids: string[] | null;
};

export async function getWorkEditExtras(workId: string): Promise<WorkEditExtras | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("license_note, ai_assisted, ai_disclosure_note, project_assets, external_links, collab_user_ids")
    .eq("id", workId)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkEditExtras | null) ?? null;
}

// ---------- CREDITS: people tagged on the work (old PortfolioCollabUserPicker) ----------

/**
 * Accepted (on the work), waiting (tag not answered yet, can be cancelled) and declined (cannot be tagged again
 * on this work). Accepted ids come from `collab_user_ids`, which only the database writes (respond_project_collab_invite).
 */
export type WorkCredits = { accepted: TaggedUserSummary[]; pending: TaggedUserSummary[]; declined: TaggedUserSummary[]; inviteIds: Record<string, string> };

export const NO_CREDITS: WorkCredits = { accepted: [], pending: [], declined: [], inviteIds: {} };

export async function getWorkCredits(workId: string, acceptedIds: readonly string[]): Promise<WorkCredits> {
  const invites = await fetchProjectCollabInvites(workId);
  const pendingIds = invites.filter((i) => i.status === "pending").map((i) => i.invited_user_id);
  const declinedIds = invites
    .filter((i) => (i.status === "declined" || i.status === "withdrawn") && !acceptedIds.includes(i.invited_user_id) && !pendingIds.includes(i.invited_user_id))
    .map((i) => i.invited_user_id);
  const ids = [...new Set([...acceptedIds, ...pendingIds, ...declinedIds])];
  const people = ids.length ? await fetchTaggedUserSummaries(ids) : [];
  const by = new Map(people.map((p) => [p.user_id, p]));
  const pick = (list: readonly string[]) => [...new Set(list)].map((id) => by.get(id)).filter((p): p is TaggedUserSummary => !!p);
  return {
    accepted: pick(acceptedIds),
    pending: pick(pendingIds),
    declined: pick(declinedIds),
    inviteIds: Object.fromEntries(invites.filter((i) => i.status === "pending").map((i) => [i.invited_user_id, i.id])),
  };
}

/**
 * Tags new people on a saved work (old editor's syncProjectCollabInvites): only mutual follows who allow tags
 * ("who can tag me", checked by the database). They are told once the work is Published.
 */
export async function tagWorkPeople(workId: string, ownerId: string, credits: WorkCredits, added: readonly TaggedUserSummary[]): Promise<void> {
  await syncProjectCollabInvites({
    projectId: workId,
    ownerId,
    desiredUserIds: [...added, ...credits.pending, ...credits.accepted].map((u) => u.user_id),
    acceptedUserIds: credits.accepted.map((u) => u.user_id),
  });
}

/** Cancels a tag nobody has answered yet (that person can be tagged again later). */
export const cancelWorkTag = cancelProjectCollabInvite;

// ---------- FILES & LINKS (old ProjectAssetsEditor) ----------

/** One attachment into the private `project-assets` bucket (PDF, ZIP… ≤ 25 MB, contents checked against the extension). */
export async function uploadWorkAttachment(file: File, userId: string, folder: string, tier: Tier): Promise<ProjectAsset> {
  const uploaded = await uploadProjectAssetFile(file, userId, folder, tier);
  const label = file.name.replace(/\.[^.]+$/, "").trim() || file.name;
  const draft = createProjectFileAsset({ label, ...uploaded });
  return applyScanResult(draft, evaluateProjectAssetOnAdd(draft));
}

/** The server scan of new attachments (scan-project-assets), in the background; `done` gets the verdicts. */
export function scanWorkAttachments(workId: string, done: (assets: ProjectAsset[], blocked: number) => void): void {
  enqueueProjectAssetScan(workId, ({ assets, blockedCount }) => done(assets, blockedCount));
}

/** Every catalog (project_series) the work is in, oldest first — Upload's CATALOG field. */
export async function getWorkCatalogIds(workId: string): Promise<string[]> {
  const { data, error } = await supabase.from("project_series_items").select("series_id").eq("project_id", workId).order("added_at", { ascending: true });
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.series_id as string))];
}

/**
 * Upload's CATALOG field: puts the work in the catalogs picked (last place) and takes it out of the ones
 * unpicked. `before` is what the field started from, so catalogs it never showed stay as they are.
 */
export async function setWorkCatalogs(workId: string, next: readonly string[], before: readonly string[]): Promise<void> {
  for (const id of before) if (!next.includes(id)) await setCatalogWork(id, workId, false);
  for (const id of next) if (!before.includes(id)) await setCatalogWork(id, workId, true);
}
