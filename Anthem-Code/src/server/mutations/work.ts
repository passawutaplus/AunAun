import { supabase } from "@/integrations/supabase/client";

/**
 * Like or un-like one picture of a work (migration 20261128100000). A trigger keeps
 * anthem.project_likes ("liked the work") in step, so the old pages and notifications still see it.
 */
export async function setImageLiked(userId: string, projectId: string, imageUrl: string, liked: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from("project_image_likes" as any) as any;
  const { error } = liked
    ? await table.insert({ project_id: projectId, image_url: imageUrl, user_id: userId })
    : await table.delete().eq("project_id", projectId).eq("image_url", imageUrl).eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

/** Like or un-like the whole work (used only until the per-picture table exists). */
export async function setWorkLiked(userId: string, projectId: string, liked: boolean): Promise<void> {
  const table = supabase.from("project_likes");
  const { error } = liked
    ? await table.insert({ project_id: projectId, user_id: userId })
    : await table.delete().eq("project_id", projectId).eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

/** Smile at a comment, or take the smile back (migration 20261128100000). */
export async function setCommentSmiled(userId: string, commentId: string, smiled: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from("project_comment_smiles" as any) as any;
  const { error } = smiled
    ? await table.insert({ comment_id: commentId, user_id: userId })
    : await table.delete().eq("comment_id", commentId).eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

/** Count one view of a work (same RPC as the old page, once per browser session per work). */
export async function recordWorkView(projectId: string): Promise<void> {
  const key = `viewed:${projectId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // storage blocked: count anyway
  }
  const { error } = await supabase.rpc("increment_project_view", { _project_id: projectId });
  if (error) throw error;
}
