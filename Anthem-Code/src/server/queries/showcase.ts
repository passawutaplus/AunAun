import { supabase } from "@/integrations/supabase/client";

/** Columns of the new design (migration 20261127100000) are not in the generated types yet. */
const SHOWCASE_SELECT = "id, title, cover_url, gallery_urls, owner_id, created_at, cover_width, cover_height, sc_category";

export type ShowcaseRow = {
  id: string;
  title: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  owner_id: string | null;
  created_at: string;
  cover_width: number | null;
  cover_height: number | null;
  sc_category: string | null;
};

/** Published works for the home grid of the new design, newest first; `category` filters on `sc_category`. */
export async function getShowcaseRows(category: string | null, from: number, to: number): Promise<ShowcaseRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("projects") as any).select(SHOWCASE_SELECT).eq("status", "Published");
  if (category) query = query.eq("sc_category", category);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data ?? []) as ShowcaseRow[];
}

/** Ids of the works a person saved (project_bookmarks). */
export async function getSavedWorkIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("project_bookmarks").select("project_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.project_id as string);
}
