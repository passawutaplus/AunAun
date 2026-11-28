import { supabase } from "@/integrations/supabase/client";
import { isOptionalQueryError } from "@/lib/supabaseErrors";

export type EventSearchArgs = {
  /** Every item must match; one item = a word and its twins joined by "|". */
  keywords: string[];
  boost: string[];
  categories: string[];
  /** Any of these words in the event's place or title. */
  places: string[];
  free: boolean;
  from: string | null;
  to: string | null;
};

export type EventSearchHit = { id: string; score: number; exact: boolean };

/**
 * Event tab search, ranked by public.event_search (migration 20261129150000): the matching events, or the
 * nearest ones (exact = false) when nothing matches everything. `null` before that migration runs.
 */
export async function searchEvents(a: EventSearchArgs): Promise<EventSearchHit[] | null> {
  const { data, error } = await supabase.rpc(
    "event_search" as never,
    {
      _keywords: a.keywords,
      _boost: a.boost,
      _categories: a.categories,
      _places: a.places,
      _free: a.free,
      _from: a.from,
      _to: a.to,
      _limit: 60,
    } as never,
  );
  if (error) {
    if (isOptionalQueryError(error)) return null;
    throw error;
  }
  return (data ?? []) as EventSearchHit[];
}
