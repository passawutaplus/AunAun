import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Anthem portfolio tables live in the `anthem` schema (not `public.projects`). */
export function anthemDb(admin: SupabaseClient) {
  return admin.schema("anthem");
}

/** Cross-app notifications (Anthem + Solo). */
export function sharedDb(admin: SupabaseClient) {
  return admin.schema("shared");
}
