import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import { PROFILE_PAGE_SELECT, PROFILE_WORK_SELECT, type ProfilePageRow, type ProfileWorkRow } from "./profilePage";

export type StudioWork = ProfileWorkRow & { status: string | null; views: number | null; created_at: string };

/** Every own work for My Studio → Works, drafts included, newest first (mock: new uploads at the top). */
export async function getStudioWorks(userId: string): Promise<StudioWork[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select(`${PROFILE_WORK_SELECT}, status, views, created_at, is_pinned, sort_order`)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as StudioWork[];
}

export type StudioEvent = {
  id: string;
  title: string;
  category: string;
  starts_on: string | null;
  ends_on: string | null;
  location_name: string | null;
  area: string | null;
  cover_url: string | null;
  /** draft · pending · needs_revision · rejected · published */
  status: string;
};

/** Events I posted myself (not the team's curated ones), every status, newest change first. Venues of a multi-venue event are left out. */
export async function getStudioEvents(userId: string): Promise<StudioEvent[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events" as never) as any)
    .select("id, title, category, starts_on, ends_on, location_name, area, cover_url, status")
    .eq("owner_id", userId)
    .is("parent_id", null)
    .neq("origin", "curated")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as StudioEvent[];
}

export type OpenCallRow = {
  id: string;
  title: string;
  description: string | null;
  insights: unknown;
  cover_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
};

/** Published open calls still taking work (closing today or later), with their text for "FOR YOU". */
export async function getOpenCalls(todayIso: string): Promise<OpenCallRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events" as never) as any)
    .select("id, title, description, insights, cover_url, starts_on, ends_on")
    .eq("category", "open_call")
    .eq("status", "published")
    .is("parent_id", null)
    .gte("ends_on", todayIso)
    .order("ends_on", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as OpenCallRow[];
}

export type InsightDay ={ day: string; views: number; followers: number; likes: number };

/**
 * My numbers per day for the last 2 × `days` days (earlier half = the period before), from
 * public.studio_insights (migration 20261128180000). `null` before that migration runs.
 */
export async function getStudioInsights(days: number): Promise<InsightDay[] | null> {
  const { data, error } = await supabase.rpc("studio_insights" as never, { p_days: days } as never);
  if (error) {
    if (isOptionalQueryError(error)) return null;
    throw error;
  }
  return (data ?? []) as InsightDay[];
}

export type PersonRow = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null };

async function peopleById(ids: readonly string[]): Promise<Map<string, PersonRow>> {
  if (!ids.length) return new Map();
  const { data, error } = await profilesPublicFrom()
    .select("user_id, username, display_name, avatar_url" as "*")
    .in("user_id", [...new Set(ids)]);
  if (error) throw error;
  return new Map(((data ?? []) as unknown as PersonRow[]).map((p) => [p.user_id, p]));
}

export type InboxComment = { id: string; project_id: string; content: string; created_at: string; work_title: string; who: PersonRow | null };

/** Newest comments other people left on my works (Overview → Inbox). */
export async function getStudioComments(userId: string, limit = 5): Promise<InboxComment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("project_comments") as any)
    .select("id, project_id, user_id, content, created_at, projects!inner(owner_id, title)")
    .eq("projects.owner_id", userId)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isOptionalQueryError(error)) return [];
    throw error;
  }
  const rows = (data ?? []) as Array<{ id: string; project_id: string; user_id: string; content: string; created_at: string; projects: { title: string | null } | null }>;
  const who = await peopleById(rows.map((r) => r.user_id));
  return rows.map((r) => ({ id: r.id, project_id: r.project_id, content: r.content, created_at: r.created_at, work_title: r.projects?.title ?? "", who: who.get(r.user_id) ?? null }));
}

/** The people who followed me most recently (Overview → People, "ติดตามคุณ"). */
export async function getRecentFollowers(userId: string, limit = 3): Promise<PersonRow[]> {
  const { data, error } = await supabase.from("follows").select("follower_id, created_at").eq("following_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const ids = ((data ?? []) as Array<{ follower_id: string }>).map((r) => r.follower_id);
  const who = await peopleById(ids);
  return ids.map((id) => who.get(id)).filter((p): p is PersonRow => !!p);
}

export type StudioProfile = ProfilePageRow & {
  display_name_changed_at: string | null;
  profile_onboarding_at: string | null;
  /** Uncropped cover; "ปรับตำแหน่ง" re-crops from it. */
  cover_original_url: string | null;
};

/** My profile row with what the Profile tab needs to know about the name lock (30 days, DB trigger). */
export async function getStudioProfile(userId: string): Promise<StudioProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`${PROFILE_PAGE_SELECT}, display_name_changed_at, profile_onboarding_at, cover_original_url` as "*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as StudioProfile | null) ?? null;
}
