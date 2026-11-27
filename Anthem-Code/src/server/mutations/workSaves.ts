import { supabase } from "@/integrations/supabase/client";

/** Save or un-save a work for a person (project_bookmarks). */
export async function setWorkSaved(userId: string, projectId: string, saved: boolean): Promise<void> {
  const table = supabase.from("project_bookmarks");
  const { error } = saved
    ? await table.insert({ project_id: projectId, user_id: userId })
    : await table.delete().eq("project_id", projectId).eq("user_id", userId);
  if (error) throw error;
}
