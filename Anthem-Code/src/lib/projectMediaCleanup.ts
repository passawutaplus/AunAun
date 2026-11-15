import { supabase } from "@/integrations/supabase/client";
import { ANTHEM_MEDIA_BUCKET } from "@/lib/storageQuotas";
import { PROJECT_ASSETS_BUCKET } from "@/lib/projectAssetStorage";
import { invalidateAnthemStorageCache } from "@/lib/anthemStorageUsage";
import { hasThumb, originalPathFromThumb, thumbPathFor } from "@/lib/mediaThumb";

const UUID = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`, "i");

/** Every column of a work that can point at an uploaded file. */
const PROJECT_FILE_COLUMNS =
  "cover_url, gallery_urls, video_urls, content_blocks, context_images, flex_grid_layout, project_assets" as const;

/** PostgREST caps a response at 1000 rows; at the cap we cannot be sure we saw every reference. */
const ROW_CAP = 1000;
const REMOVE_CHUNK = 100;

export type ProjectFileRefs = {
  /** Paths in the public `project-media` bucket. */
  media: Set<string>;
  /** Paths in the private `project-assets` bucket. */
  assets: Set<string>;
};

export type ProjectFileSnapshot = ProjectFileRefs & { userId: string };

function safeDecode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Files in the user's own work folders that `value` mentions, wherever they sit in it (public URL,
 * bare storage path, nested block JSON).
 *
 * Only the editor's upload folder counts: `anthem/<user>/<uuid>/…` and `<user>/<uuid>/assets/…`.
 * Avatars, community posts, chat and event uploads use differently named folders, so they are never returned.
 */
export function collectProjectFileRefs(value: unknown, userId: string): ProjectFileRefs {
  const refs: ProjectFileRefs = { media: new Set(), assets: new Set() };
  if (!UUID_RE.test(userId)) return refs;
  const text = JSON.stringify(value) ?? "";

  const mediaRe = new RegExp(`anthem/${userId}/${UUID}/[^"'<>\\\\?#\\s]+`, "gi");
  for (const m of text.matchAll(mediaRe)) refs.media.add(safeDecode(m[0]));

  const assetRe = new RegExp(`"(${userId}/${UUID}/assets/[^"\\\\]+)"`, "gi");
  for (const m of text.matchAll(assetRe)) refs.assets.add(m[1]);

  return refs;
}

/**
 * Call BEFORE deleting the row: remembers which files the work uses, plus anything left in its own
 * upload folder by earlier edits. Returns null when it cannot tell (then nothing is removed).
 */
export async function snapshotProjectFiles(projectId: string): Promise<ProjectFileSnapshot | null> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId || !UUID_RE.test(projectId)) return null;

    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_FILE_COLUMNS)
      .eq("id", projectId)
      .maybeSingle();
    if (error || !data) return null;

    const refs = collectProjectFileRefs(data, userId);

    // A saved work uploads into a folder named after its id; files swapped out in later edits stay there.
    const folder = `anthem/${userId}/${projectId}`;
    const { data: listed } = await supabase.storage.from(ANTHEM_MEDIA_BUCKET).list(folder, { limit: ROW_CAP });
    for (const f of listed ?? []) {
      if (f.id) refs.media.add(`${folder}/${f.name}`);
    }

    return { userId, ...refs };
  } catch {
    return null;
  }
}

async function removeInChunks(bucket: string, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + REMOVE_CHUNK));
    if (error) console.warn(`[project-media] could not remove files from ${bucket}`, error);
  }
}

/**
 * Call AFTER the row is gone: removes the snapshot's files unless another work or a community post of the
 * same user still shows them (a post made from a work reuses the work's image URLs).
 * Never throws; when the check cannot be completed the files are kept.
 */
export async function removeUnreferencedProjectFiles(snapshot: ProjectFileSnapshot): Promise<void> {
  try {
    const { userId } = snapshot;
    if (!snapshot.media.size && !snapshot.assets.size) return;

    const [works, posts] = await Promise.all([
      supabase.from("projects").select(PROJECT_FILE_COLUMNS).eq("owner_id", userId).limit(ROW_CAP),
      supabase.from("community_posts").select("gallery_urls, video_urls").eq("author_id", userId).limit(ROW_CAP),
    ]);
    if (works.error || posts.error) return;
    if ((works.data?.length ?? 0) >= ROW_CAP || (posts.data?.length ?? 0) >= ROW_CAP) return;

    const stillUsed = collectProjectFileRefs([works.data, posts.data], userId);
    // A small copy (<file>.w640.webp) lives and dies with its original.
    const media = [
      ...new Set(
        [...snapshot.media]
          .filter((p) => !stillUsed.media.has(originalPathFromThumb(p) ?? p))
          .flatMap((p) => (hasThumb(p) ? [p, thumbPathFor(p)] : [p])),
      ),
    ];
    const assets = [...snapshot.assets].filter((p) => !stillUsed.assets.has(p));

    await removeInChunks(ANTHEM_MEDIA_BUCKET, media);
    await removeInChunks(PROJECT_ASSETS_BUCKET, assets);
    if (media.length || assets.length) invalidateAnthemStorageCache(userId);
  } catch (e) {
    console.warn("[project-media] cleanup skipped", e);
  }
}
