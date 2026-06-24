import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RETENTION_DAYS = 7;

/** Delete meeting media files older than 7 days after status=ready. Keeps transcript + extract_result. */
export async function runMeetingCaptureCleanup(): Promise<{
  scanned: number;
  deleted: number;
  errors: string[];
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const { data: rows, error } = await (supabaseAdmin as any)
    .from("meeting_captures")
    .select("id, user_id, media_path, updated_at")
    .eq("status", "ready")
    .not("media_path", "is", null)
    .lt("updated_at", cutoff.toISOString())
    .limit(200);

  if (error) throw new Error(error.message);

  let deleted = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    if (!row.media_path) continue;
    const { error: rmErr } = await supabaseAdmin.storage
      .from("meeting-captures")
      .remove([row.media_path]);
    if (rmErr) {
      errors.push(`${row.id}: ${rmErr.message}`);
      continue;
    }
    const { error: upErr } = await (supabaseAdmin as any)
      .from("meeting_captures")
      .update({ media_path: null })
      .eq("id", row.id);
    if (upErr) errors.push(`${row.id}: ${upErr.message}`);
    else deleted += 1;
  }

  return { scanned: rows?.length ?? 0, deleted, errors };
}
