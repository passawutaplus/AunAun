/**
 * Profile queries — pure async fns, no React.
 * Component / hooks call these via React Query.
 */
import { supabase } from "@/integrations/supabase/client";

export type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

/** Batch fetch profiles by id. Used by feed, chat, requests — single source of truth. */
export async function getProfilesByIds(ids: string[]): Promise<ProfileLite[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, username")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as ProfileLite[];
}

/** Map array → record for O(1) lookup. */
export function indexProfiles(profiles: ProfileLite[]): Record<string, ProfileLite> {
  return profiles.reduce<Record<string, ProfileLite>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
}
