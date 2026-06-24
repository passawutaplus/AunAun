/**
 * Pure async Supabase queries for profiles.
 * No React, no hooks — reusable from both React Query (browser) and
 * createServerFn handlers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function getProfilesByIds(
  ids: readonly string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
): Promise<ProfileLite[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids as string[]);
  if (error) throw error;
  return (data ?? []) as ProfileLite[];
}
