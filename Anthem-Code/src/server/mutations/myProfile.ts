import { supabase } from "@/integrations/supabase/client";

/**
 * The globe/lock on one of my works: 'Private' hides it from everyone else (RLS), 'Published'
 * shows it again. Drafts are never touched. Unlocking does not re-send "new work" notifications
 * (migration 20261128160000).
 */
export async function setWorkLocked(workId: string, locked: boolean): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ status: locked ? "Private" : "Published" } as never)
    .eq("id", workId)
    .in("status", ["Published", "Private"]);
  if (error) throw error;
}

/** Public / Private of one of my catalogs (project_series.is_public). */
export async function setCatalogPublic(catalogId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from("project_series").update({ is_public: isPublic }).eq("id", catalogId);
  if (error) throw error;
}

// Collections (anthem.collections + collection_items). item_count and updated_at follow from DB triggers.
// collection_items has no unique key, so callers pass only works that are not in the collection yet.

export async function renameCollection(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("collections").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function setCollectionPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from("collections").update({ is_public: isPublic }).eq("id", id);
  if (error) throw error;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}

export async function addToCollection(collectionId: string, projectIds: readonly string[]): Promise<void> {
  if (!projectIds.length) return;
  const { error } = await supabase
    .from("collection_items")
    .insert(projectIds.map((project_id) => ({ collection_id: collectionId, project_id })));
  if (error) throw error;
}

export async function removeFromCollection(collectionId: string, projectIds: readonly string[]): Promise<void> {
  if (!projectIds.length) return;
  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collectionId).in("project_id", [...projectIds]);
  if (error) throw error;
}

/** A new private collection holding these works (mock: "ย้ายไป → คอลเลคชั่นใหม่"). */
export async function createCollectionWith(userId: string, name: string, projectIds: readonly string[]): Promise<string> {
  const { data, error } = await supabase
    .from("collections")
    .insert({ owner_id: userId, name, description: "", category: "", is_public: false })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;
  await addToCollection(id, projectIds);
  return id;
}

/** Saves the shown order; the first three works make the cover (mock "เปลี่ยนปก" moves the first to the end). */
export async function reorderCollection(collectionId: string, projectIds: readonly string[]): Promise<void> {
  const results = await Promise.all(
    projectIds.map((project_id, position) =>
      supabase.from("collection_items").update({ position }).eq("collection_id", collectionId).eq("project_id", project_id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** "เอาออก" in "ทั้งหมดที่บันทึก": the works are no longer saved, nor in any of my collections. */
export async function unsaveWorks(userId: string, projectIds: readonly string[], collectionIds: readonly string[]): Promise<void> {
  if (!projectIds.length) return;
  const { error } = await supabase.from("project_bookmarks").delete().eq("user_id", userId).in("project_id", [...projectIds]);
  if (error) throw error;
  if (collectionIds.length) {
    const { error: cErr } = await supabase
      .from("collection_items")
      .delete()
      .in("collection_id", [...collectionIds])
      .in("project_id", [...projectIds]);
    if (cErr) throw cErr;
  }
}
