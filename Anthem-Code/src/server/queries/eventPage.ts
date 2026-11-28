/**
 * Event page of the new design (`/exhibition/:id`, id or slug). Pure async functions; hooks live in src/redesign/event.
 * Columns added later (insights, slug, cover sizes, venue fields) are not in the generated types yet.
 */
import { supabase } from "@/integrations/supabase/client";
import { EVENT_SELECT, isEventUuid, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { VENUE_SELECT, type EventVenue } from "@/lib/eventVenues";

const EVENT_PAGE_SELECT = `${EVENT_SELECT}, slug, parent_id, insights, cover_width, cover_height, media_sizes, area, address, lat, lng, opening_hours, hours_note, name_en, transit_note, admission_note, date_note, coords_approx`;

export type EventPageRow = ExhibitionEvent & {
  slug: string | null;
  parent_id: string | null;
  insights: unknown;
  cover_width: number | null;
  cover_height: number | null;
  /** `{ url: [width, height] }` for the cover and gallery pictures. */
  media_sizes: Record<string, [number, number]> | null;
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  opening_hours: unknown;
  hours_note: string | null;
  /** Venue rows (parent_id set) only: shown on a venue's own page like the old one. */
  name_en: string | null;
  transit_note: string | null;
  admission_note: string | null;
  date_note: string | null;
  coords_approx: boolean | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const events = () => supabase.from("events" as never) as any;

/** One event (or venue) by id or slug. RLS returns published events, plus the owner's own. */
export async function getEventPage(idOrSlug: string): Promise<EventPageRow | null> {
  const byId = isEventUuid(idOrSlug);
  const { data, error } = await events()
    .select(EVENT_PAGE_SELECT)
    .eq(byId ? "id" : "slug", byId ? idOrSlug : decodeURIComponent(idOrSlug))
    .maybeSingle();
  if (error) throw error;
  return (data as EventPageRow | null) ?? null;
}

export type EventPageVenue = EventVenue & { slug: string | null };

/** Venues of a multi-venue event (Bangkok Art Biennale), in the team's order. */
export async function getEventVenues(parentId: string): Promise<EventPageVenue[]> {
  const { data, error } = await events()
    .select(`${VENUE_SELECT}, slug`)
    .eq("parent_id", parentId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as EventPageVenue[]).map((v) => ({ ...v, gallery_urls: v.gallery_urls ?? [], opening_hours: v.opening_hours ?? [] }));
}

export type ParentEventRow = { id: string; slug: string | null; title: string; cover_url: string | null };

/** The event a venue belongs to (breadcrumb and back link of a venue page; its cover when the venue has no picture). */
export async function getParentEvent(id: string): Promise<ParentEventRow | null> {
  const { data, error } = await events().select("id, slug, title, cover_url").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ParentEventRow | null) ?? null;
}
