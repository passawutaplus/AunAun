import { supabase } from "@/integrations/supabase/client";

/** Pin / unpin one of my works (pinned works come first on my profile). */
export async function setWorkPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("projects").update({ is_pinned: pinned }).eq("id", id);
  if (error) throw error;
}

/** Order of my works on my profile (`sort_order`, smaller first). */
export async function setWorkOrder(rows: ReadonlyArray<{ id: string; sort_order: number }>): Promise<void> {
  const results = await Promise.all(rows.map((r) => supabase.from("projects").update({ sort_order: r.sort_order }).eq("id", r.id)));
  const err = results.find((r) => r.error)?.error;
  if (err) throw err;
}
