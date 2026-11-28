/**
 * EventPost (step 11): the signed-in member's own event, to edit it. Pure async function; the page holds the hook.
 * Columns added later (insights, slug, cover sizes) are not in the generated types yet.
 */
import { supabase } from "@/integrations/supabase/client";
import { EVENT_SELECT, type ExhibitionEvent } from "@/lib/exhibitionEvents";

export type MyEventRow = ExhibitionEvent & {
  slug: string | null;
  parent_id: string | null;
  insights: unknown;
  cover_width: number | null;
  cover_height: number | null;
  media_sizes: Record<string, [number, number]> | null;
};

/** The event if it is the member's own and editable here (a main event they posted, not the team's). */
export async function getMyEvent(id: string, ownerId: string): Promise<MyEventRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events" as never) as any)
    .select(`${EVENT_SELECT}, slug, parent_id, insights, cover_width, cover_height, media_sizes`)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  const row = (data as MyEventRow | null) ?? null;
  return row && !row.parent_id && row.origin === "community" ? row : null;
}
