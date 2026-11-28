import { supabase } from "@/integrations/supabase/client";
import { isOptionalQueryError } from "@/lib/supabaseErrors";

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

export type ShowcaseFilter = {
  /** One of the 22 CATEGORY values (`sc_category`). */
  category?: string | null;
  /** Only works of these people (Following). */
  ownerIds?: readonly string[];
  /** Only these works (personal picks, saved works). */
  ids?: readonly string[];
  /** Leave these works out (kept off the home page, or already shown higher up). */
  excludeIds?: readonly string[];
};

/** Published works for the home grid of the new design, newest first. */
export async function getShowcaseRows(filter: ShowcaseFilter, from: number, to: number): Promise<ShowcaseRow[]> {
  if (filter.ownerIds && !filter.ownerIds.length) return [];
  if (filter.ids && !filter.ids.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("projects") as any).select(SHOWCASE_SELECT).eq("status", "Published");
  if (filter.category) query = query.eq("sc_category", filter.category);
  if (filter.ownerIds) query = query.in("owner_id", filter.ownerIds);
  if (filter.ids) query = query.in("id", filter.ids);
  if (filter.excludeIds?.length) query = query.not("id", "in", "(" + filter.excludeIds.join(",") + ")");
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

/** Ids of the people a person follows. */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.following_id as string);
}

/**
 * Works the team keeps off the home page (test uploads). They stay published everywhere else.
 * Table anthem.home_hidden_projects (migration 20261127210000); an empty list until that migration has run.
 */
export async function getHomeHiddenIds(): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("home_hidden_projects" as any) as any).select("project_id");
  if (error) {
    if (isOptionalQueryError(error)) return [];
    throw error;
  }
  return ((data ?? []) as Array<{ project_id: string }>).map((r) => r.project_id);
}
