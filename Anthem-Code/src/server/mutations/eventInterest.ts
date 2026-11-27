import { supabase } from "@/integrations/supabase/client";

/** "สนใจ" on an event: toggles it for the signed-in person (also opts in to the reminder before it starts). */
export async function toggleEventInterest(eventId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("toggle_event_interest", { _event_id: eventId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { interested?: boolean } | null;
  return !!row?.interested;
}
