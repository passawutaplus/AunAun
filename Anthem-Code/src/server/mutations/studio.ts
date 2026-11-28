import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/core/subscription";
import { removeUnreferencedProjectFiles, snapshotProjectFiles } from "@/lib/projectMediaCleanup";
import { uploadProjectImage } from "@/lib/uploadImage";

/** Fields of My Studio → Profile (mock). Only the ones that changed are sent. */
export type StudioProfilePatch = Partial<{
  display_name: string;
  bio: string | null;
  sc_categories: string[];
  skills: string[];
  location: string | null;
  /** Cleared when CITY changes, so the city typed here is the one profiles show. */
  profile_address: null;
  instagram: string | null;
  contact_email: string | null;
  website: string | null;
  avatar_url: string;
}>;

export async function saveStudioProfile(userId: string, patch: StudioProfilePatch): Promise<void> {
  if (!Object.keys(patch).length) return;
  const { error } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("user_id", userId);
  if (error) throw error;
}

/** A new profile picture into `project-media` (old pipeline: HEIC, compression, quota). Returns its URL. */
export function uploadAvatar(file: File, userId: string, tier: Tier): Promise<string> {
  return uploadProjectImage(file, userId, "avatar", tier, { fastQuotaCheck: true });
}

// ---------- catalogs (project_series) ----------

/** A new catalog, private until I make it public in My Profile (mock: new catalogs are private). Returns its id. */
export async function createCatalog(userId: string, title: string): Promise<string> {
  const { data: last } = await supabase.from("project_series").select("sort_order").eq("owner_id", userId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("project_series")
    .insert({ owner_id: userId, title, is_public: false, sort_order: ((last?.sort_order as number | null) ?? -1) + 1 } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function renameCatalog(id: string, title: string): Promise<void> {
  const { error } = await supabase.from("project_series").update({ title } as never).eq("id", id);
  if (error) throw error;
}

/** Deletes the catalog only; its works stay (items go with it, ON DELETE CASCADE). */
export async function deleteCatalog(id: string): Promise<void> {
  const { error } = await supabase.from("project_series").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Puts a work in a catalog (last place) or takes it out. A work is in one catalog at most (unique
 * index), so putting it here takes it out of any other catalog first.
 */
export async function setCatalogWork(catalogId: string, workId: string, inside: boolean): Promise<void> {
  if (!inside) {
    const { error } = await supabase.from("project_series_items").delete().eq("series_id", catalogId).eq("project_id", workId);
    if (error) throw error;
    return;
  }
  const { error: dErr } = await supabase.from("project_series_items").delete().eq("project_id", workId);
  if (dErr) throw dErr;
  const { data: last } = await supabase.from("project_series_items").select("position").eq("series_id", catalogId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase
    .from("project_series_items")
    .insert({ series_id: catalogId, project_id: workId, position: ((last?.position as number | undefined) ?? -1) + 1 });
  if (error) throw error;
}

/** Deletes one of my works, then its files that nothing else uses (as the old manage page). */
export async function deleteWork(workId: string): Promise<void> {
  const files = await snapshotProjectFiles(workId);
  const { error } = await supabase.from("projects").delete().eq("id", workId);
  if (error) throw error;
  if (files) void removeUnreferencedProjectFiles(files);
}
