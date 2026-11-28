/**
 * "My profile" of the new design (`/portfolio`): the signed-in person's own profile, with what only
 * they see (locked works, private catalogs and collections, everything they saved or follow).
 * Pure async functions; hooks live in src/redesign/profile. RLS already limits every read to the owner.
 */
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import { PROFILE_PAGE_SELECT, PROFILE_WORK_SELECT, type ProfilePageRow, type ProfileWorkRow } from "./profilePage";

/** The own profile row: every field, also the ones hidden from others by public_visibility. */
export async function getMyProfile(userId: string): Promise<ProfilePageRow | null> {
  const { data, error } = await supabase.from("profiles").select(PROFILE_PAGE_SELECT as "*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as unknown as ProfilePageRow | null) ?? null;
}

/** 'Published' works show on the profile; 'Private' ones (the lock) only to their owner. */
export type MyWorkRow = ProfileWorkRow & { status: "Published" | "Private" };

/** Own works in the profile order (pinned, own order, newest); drafts stay in the studio. */
export async function getMyWorks(userId: string): Promise<MyWorkRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select(PROFILE_WORK_SELECT + ", status")
    .eq("owner_id", userId)
    .in("status", ["Published", "Private"])
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MyWorkRow[];
}

export type MyCatalog = { id: string; title: string; isPublic: boolean; projectIds: string[] };

/** Every own catalog (project_series), public or not, each with its works in order. */
export async function getMyCatalogs(userId: string): Promise<MyCatalog[]> {
  const { data: series, error } = await supabase
    .from("project_series")
    .select("id, title, is_public, sort_order")
    .eq("owner_id", userId)
    .order("sort_order", { ascending: true });
  if (error) {
    if (isOptionalQueryError(error)) return [];
    throw error;
  }
  const ids = (series ?? []).map((s) => s.id as string);
  if (!ids.length) return [];
  const { data: items, error: iErr } = await supabase
    .from("project_series_items")
    .select("series_id, project_id, position")
    .in("series_id", ids)
    .order("position", { ascending: true });
  if (iErr) throw iErr;
  return (series ?? []).map((s) => ({
    id: s.id as string,
    title: ((s.title as string | null) ?? "").trim(),
    isPublic: s.is_public !== false,
    projectIds: (items ?? []).filter((r) => r.series_id === s.id).map((r) => r.project_id as string),
  }));
}

/** People the person follows, newest first. */
export async function getMyFollowingIds(userId: string, limit = 200): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.following_id as string);
}

export type FollowingCardRow = Pick<
  ProfilePageRow,
  "user_id" | "username" | "display_name" | "avatar_url" | "sc_categories" | "location" | "profile_address" | "public_visibility"
> & { covers: string[] };

/** A card per followed person: name, CATEGORY · city, and the covers of their three newest works. */
export async function getFollowingCards(ids: readonly string[]): Promise<FollowingCardRow[]> {
  if (!ids.length) return [];
  const { data: people, error } = await profilesPublicFrom()
    .select("user_id, username, display_name, avatar_url, sc_categories, location, profile_address, public_visibility" as "*")
    .in("user_id", [...ids]);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: works, error: wErr } = await (supabase.from("projects") as any)
    .select("owner_id, cover_url, gallery_urls, created_at")
    .in("owner_id", [...ids])
    .eq("status", "Published")
    .order("created_at", { ascending: false })
    .limit(Math.min(1000, ids.length * 12));
  if (wErr) throw wErr;
  const covers = new Map<string, string[]>();
  for (const w of (works ?? []) as Array<{ owner_id: string; cover_url: string | null; gallery_urls: string[] | null }>) {
    const list = covers.get(w.owner_id) ?? [];
    const url = w.cover_url || w.gallery_urls?.[0];
    if (url && list.length < 3) covers.set(w.owner_id, [...list, url]);
  }
  const byId = new Map(((people ?? []) as unknown as Array<Omit<FollowingCardRow, "covers">>).map((p) => [p.user_id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Omit<FollowingCardRow, "covers"> => !!p)
    .map((p) => ({ ...p, covers: covers.get(p.user_id) ?? [] }));
}

/** Works the person saved (project_bookmarks), newest first. */
export async function getMySavedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_bookmarks")
    .select("project_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.project_id as string);
}

export type MyCollection = { id: string; name: string; isPublic: boolean; projectIds: string[] };

/** Every own collection, public or private, each with its works in the shown order. */
export async function getMyCollections(userId: string): Promise<MyCollection[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: colls, error } = await (supabase.from("collections" as never) as any)
    .select("id, name, is_public, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const rows = (colls ?? []) as Array<{ id: string; name: string | null; is_public: boolean | null }>;
  if (!rows.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error: iErr } = await (supabase.from("collection_items" as never) as any)
    .select("collection_id, project_id, position, added_at")
    .in("collection_id", rows.map((c) => c.id))
    .not("project_id", "is", null)
    .order("position", { ascending: true, nullsFirst: true })
    .order("added_at", { ascending: false });
  if (iErr) throw iErr;
  const list = (items ?? []) as Array<{ collection_id: string; project_id: string }>;
  return rows.map((c) => ({
    id: c.id,
    name: (c.name ?? "").trim(),
    isPublic: !!c.is_public,
    projectIds: [...new Set(list.filter((r) => r.collection_id === c.id).map((r) => r.project_id))],
  }));
}

/** Events the person marked "สนใจ" (their own rows only), newest mark first. */
export async function getMyInterestedIds(userId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("event_interests" as never) as any)
    .select("event_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (isOptionalQueryError(error)) return [];
    throw error;
  }
  return ((data ?? []) as Array<{ event_id: string }>).map((r) => r.event_id);
}
