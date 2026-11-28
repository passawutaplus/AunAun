import { supabase } from "@/integrations/supabase/client";

const HOME_EVENT_SELECT =
  "id, title, category, starts_on, ends_on, time_note, location_name, area, fee_type, cover_url, origin, owner_id, is_featured, featured_until, parent_id, sort_order, slug";

export type HomeEventRow = {
  id: string;
  title: string;
  category: string;
  starts_on: string | null;
  ends_on: string | null;
  time_note: string | null;
  location_name: string | null;
  area: string | null;
  /** "free" | "paid" | "unspecified" — "ฟรี" in the search while the server search is not there yet. */
  fee_type?: string | null;
  cover_url: string | null;
  origin: string | null;
  /** Who posted it: the team for curated events, else a member (label "CURATED BY …"). */
  owner_id: string | null;
  is_featured: boolean | null;
  featured_until: string | null;
  /** Set on the venues of a multi-venue event (Bangkok Art Biennale). */
  parent_id: string | null;
  sort_order: number | null;
  slug: string | null;
};

/** Every published event and venue, for the Event tab of the new home page. */
export async function getHomeEvents(): Promise<HomeEventRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events" as never) as any)
    .select(HOME_EVENT_SELECT)
    .eq("status", "published")
    .order("starts_on", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as HomeEventRow[];
}
