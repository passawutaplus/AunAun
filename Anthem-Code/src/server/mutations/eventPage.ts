import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

/**
 * "แจ้งปัญหางานนี้" (mock: ข้อมูลผิด / ลิงก์เสีย / ปิดรับแล้ว / อื่นๆ). create_report has no reasons for these yet,
 * so they go in as "other" with the chosen label in the details; the team reads them in the report queue.
 */
export async function reportEvent(eventId: string, ownerId: string, label: string): Promise<void> {
  const { error } = await rpc("create_report", {
    _target_type: "event",
    _target_id: eventId,
    _target_owner_id: ownerId,
    _reason: "other",
    _details: label,
  });
  if (error) throw error;
}

/** One view per event per browser session (same RPC as the old page). */
export async function recordEventView(eventId: string): Promise<void> {
  const { error } = await rpc("increment_event_view", { _event_id: eventId });
  if (error) throw error;
}

/** "สนใจทุกสถานที่" on a multi-venue event: every venue on, or every venue off. */
export async function setVenuesInterest(parentId: string, on: boolean): Promise<void> {
  const { error } = await rpc("set_event_venues_interest", { _parent_id: parentId, _on: on });
  if (error) throw error;
}
