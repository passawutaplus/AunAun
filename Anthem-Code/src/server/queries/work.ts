import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError } from "@/lib/supabaseErrors";

/** Columns of the Work page. The redesign columns (migration 20261127100000) are not in the generated types yet. */
const WORK_SELECT =
  "id, title, description, cover_url, gallery_urls, video_urls, content_blocks, media_sizes, cover_width, cover_height, sc_category, category, tags, tools, license_type, views, created_at, owner_id, status";

export type WorkRow = {
  id: string;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  video_urls: string[] | null;
  content_blocks: unknown;
  /** { "<image url>": [width, height] } */
  media_sizes: Record<string, [number, number]> | null;
  cover_width: number | null;
  cover_height: number | null;
  sc_category: string | null;
  category: string | null;
  tags: string[] | null;
  tools: string[] | null;
  license_type: string | null;
  views: number | null;
  created_at: string;
  owner_id: string | null;
  status: string | null;
};

/** One work for the Work page (RLS decides who may read an unpublished one). */
export async function getWork(id: string): Promise<WorkRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any).select(WORK_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as WorkRow | null) ?? null;
}

export type WorkOwner = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  instagram: string | null;
  website: string | null;
  contact_email: string | null;
};

/** The public profile of a work's owner, with the contact links the Work page shows. */
export async function getWorkOwner(userId: string): Promise<WorkOwner | null> {
  const { data, error } = await profilesPublicFrom()
    .select("user_id, display_name, username, avatar_url, instagram, website, contact_email" as "*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as WorkOwner | null) ?? null;
}

export type ImageLikeSummary = { image_url: string; likes: number; liked: boolean };

/**
 * Likes per picture of a work (migration 20261128100000). `null` while that migration has not run:
 * the page then shows the work's own like on its first picture.
 */
export async function getWorkImageLikes(projectId: string): Promise<ImageLikeSummary[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("project_image_like_summary", { _project_id: projectId });
  if (error) {
    if (isOptionalQueryError(error) || error.code === "PGRST202") return null;
    throw error;
  }
  return (data ?? []) as ImageLikeSummary[];
}

/** Likes of the whole work and whether the caller liked it (fallback before the per-picture table exists). */
export async function getWorkLike(projectId: string): Promise<{ likes: number; liked: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("project_like_summary", { ids: [projectId] });
  if (error) throw error;
  const row = ((data ?? []) as Array<{ likes: number; liked: boolean }>)[0];
  return { likes: row?.likes ?? 0, liked: !!row?.liked };
}

export type WorkCatalog = { id: string; title: string; projectIds: string[] };

/** The first public catalog (project_series) that holds this work, with its other works in order. */
export async function getWorkCatalog(projectId: string): Promise<WorkCatalog | null> {
  const { data: links, error } = await supabase
    .from("project_series_items")
    .select("series_id")
    .eq("project_id", projectId)
    .limit(5);
  if (error) {
    if (isOptionalQueryError(error)) return null;
    throw error;
  }
  const seriesIds = (links ?? []).map((r) => r.series_id as string);
  if (!seriesIds.length) return null;
  const { data: series, error: sErr } = await supabase
    .from("project_series")
    .select("id, title, sort_order")
    .in("id", seriesIds)
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .limit(1);
  if (sErr) throw sErr;
  const first = series?.[0];
  if (!first) return null;
  const { data: items, error: iErr } = await supabase
    .from("project_series_items")
    .select("project_id, position")
    .eq("series_id", first.id)
    .order("position", { ascending: true });
  if (iErr) throw iErr;
  return {
    id: first.id as string,
    title: (first.title as string | null)?.trim() || "",
    projectIds: (items ?? []).map((r) => r.project_id as string).filter((id) => id !== projectId),
  };
}

/** Who smiled at which comment (migration 20261128100000); `null` before that migration has run. */
export async function getCommentSmiles(commentIds: readonly string[]): Promise<Array<{ comment_id: string; user_id: string }> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase.from("project_comment_smiles" as any) as any).select("comment_id, user_id");
  // With no comments yet, still ask once (limit 0) so the page knows whether the table exists.
  const { data, error } = await (commentIds.length ? query.in("comment_id", commentIds) : query.limit(0));
  if (error) {
    if (isOptionalQueryError(error)) return null;
    throw error;
  }
  return (data ?? []) as Array<{ comment_id: string; user_id: string }>;
}
