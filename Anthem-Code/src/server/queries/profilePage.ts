/**
 * Profile page of the new design (`/@handle`, `/u/:id`). Pure async functions; hooks live in src/redesign/profile.
 * Columns added for the redesign (sc_categories, contact_email, cover sizes) are not in the generated types yet.
 */
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isUuid } from "@/lib/profileRoutes";
import { isOptionalQueryError } from "@/lib/supabaseErrors";

export const PROFILE_PAGE_SELECT =
  "user_id, username, display_name, avatar_url, bio, skills, location, profile_address, instagram, website, contact_email, sc_categories, public_visibility, cover_url, facebook, line_id, social_links";

export type ProfilePageRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  location: string | null;
  profile_address: unknown;
  instagram: string | null;
  website: string | null;
  contact_email: string | null;
  sc_categories: string[] | null;
  public_visibility: unknown;
  /** Cover banner (32:9 crop) and the old contact fields, shown in the profile header / About. */
  cover_url: string | null;
  facebook: string | null;
  line_id: string | null;
  social_links: unknown;
};

/** A public profile by handle (without @) or by user id. */
export async function getProfilePage(slug: string): Promise<ProfilePageRow | null> {
  const query = profilesPublicFrom().select(PROFILE_PAGE_SELECT as "*");
  const { data, error } = await (isUuid(slug) ? query.eq("user_id", slug) : query.eq("username", slug.toLowerCase())).maybeSingle();
  if (error) throw error;
  return (data as unknown as ProfilePageRow | null) ?? null;
}

export const PROFILE_WORK_SELECT = "id, title, cover_url, gallery_urls, cover_width, cover_height, sc_category, tools, tags";

export type ProfileWorkRow = {
  id: string;
  title: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  cover_width: number | null;
  cover_height: number | null;
  sc_category: string | null;
  tools: string[] | null;
  tags: string[] | null;
};

/** Published works of one person in the order the owner set (pinned, then their order, then newest). */
export async function getProfileWorks(ownerId: string): Promise<ProfileWorkRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select(PROFILE_WORK_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "Published")
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;
  return (data ?? []) as ProfileWorkRow[];
}

export type ProfileCatalog = { id: string; title: string; projectIds: string[] };

/** The person's public catalogs (project_series), each with its works in order. */
export async function getProfileCatalogs(ownerId: string): Promise<ProfileCatalog[]> {
  const { data: series, error } = await supabase
    .from("project_series")
    .select("id, title, sort_order")
    .eq("owner_id", ownerId)
    .eq("is_public", true)
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
    projectIds: (items ?? []).filter((r) => r.series_id === s.id).map((r) => r.project_id as string),
  }));
}

export type ProfileCollection = { id: string; name: string; projectIds: string[] };

/** Collections the person made public (anthem.collections.is_public), each with its saved works in order. */
export async function getProfileCollections(ownerId: string): Promise<ProfileCollection[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: colls, error } = await (supabase.from("collections" as never) as any)
    .select("id, name, updated_at")
    .eq("owner_id", ownerId)
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  if (error) {
    if (isOptionalQueryError(error)) return [];
    throw error;
  }
  const rows = (colls ?? []) as Array<{ id: string; name: string | null }>;
  if (!rows.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error: iErr } = await (supabase.from("collection_items" as never) as any)
    .select("collection_id, project_id, position, added_at")
    .in("collection_id", rows.map((c) => c.id))
    .not("project_id", "is", null)
    .order("position", { ascending: true })
    .order("added_at", { ascending: false });
  if (iErr) throw iErr;
  const list = (items ?? []) as Array<{ collection_id: string; project_id: string }>;
  return rows.map((c) => ({
    id: c.id,
    name: (c.name ?? "").trim(),
    projectIds: list.filter((r) => r.collection_id === c.id).map((r) => r.project_id),
  }));
}

/** Cards of public works by id (works in someone's collection may belong to other people). */
export async function getWorksByIds(ids: readonly string[]): Promise<Array<ProfileWorkRow & { owner_id: string | null }>> {
  if (!ids.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select(PROFILE_WORK_SELECT + ", owner_id")
    .in("id", ids)
    .eq("status", "Published");
  if (error) throw error;
  return (data ?? []) as Array<ProfileWorkRow & { owner_id: string | null }>;
}

export const PROFILE_EVENT_SELECT = "id, title, category, starts_on, ends_on, location_name, cover_url, slug, origin, owner_id";

export type ProfileEventRow = {
  id: string;
  title: string;
  category: string;
  starts_on: string | null;
  ends_on: string | null;
  location_name: string | null;
  cover_url: string | null;
  slug: string | null;
  origin: string | null;
  owner_id: string | null;
};

/**
 * Events the person hosts: published events they own. Events the Samecor team curated are not
 * "hosted" by whoever holds the team account, so `curated` is left out.
 */
export async function getHostedEvents(ownerId: string): Promise<ProfileEventRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events" as never) as any)
    .select(PROFILE_EVENT_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .neq("origin", "curated")
    .order("starts_on", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ProfileEventRow[];
}

/**
 * Published events the person marked as interested — only when they chose to show them
 * (migration 20261128120000). `null` before that migration has run.
 */
export async function getInterestedEventIds(userId: string): Promise<string[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("profile_interested_events", { _user_id: userId });
  if (error) {
    if (isOptionalQueryError(error) || error.code === "PGRST202") return null;
    throw error;
  }
  return ((data ?? []) as Array<{ event_id: string }>).map((r) => r.event_id);
}

export async function getEventsByIds(ids: readonly string[]): Promise<ProfileEventRow[]> {
  if (!ids.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events" as never) as any)
    .select(PROFILE_EVENT_SELECT)
    .in("id", ids)
    .eq("status", "published");
  if (error) throw error;
  return (data ?? []) as ProfileEventRow[];
}

/** Followers of a person, newest first (follows are public). */
export async function getFollowerIds(userId: string, limit = 200): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.follower_id as string);
}
