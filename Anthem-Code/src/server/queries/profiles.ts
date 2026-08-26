/**
 * Profile queries — pure async fns, no React.
 * Component / hooks call these via React Query.
 */
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";

export type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  opportunity_types?: string[] | null;
  is_verified?: boolean | null;
};

/** Batch fetch public profiles by user_id. */
export async function getProfilesByIds(ids: string[]): Promise<ProfileLite[]> {
  if (!ids.length) return [];
  const { data, error } = await profilesPublicFrom()
    .select("user_id, id, display_name, avatar_url, username, opportunity_types, is_verified")
    .in("user_id", ids);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: (p as { user_id?: string; id: string }).user_id ?? p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    username: p.username,
    opportunity_types: (p as { opportunity_types?: string[] | null }).opportunity_types ?? null,
    is_verified: !!(p as { is_verified?: boolean | null }).is_verified,
  }));
}

/** Map array → record for O(1) lookup. */
export function indexProfiles(profiles: ProfileLite[]): Record<string, ProfileLite> {
  return profiles.reduce<Record<string, ProfileLite>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
}
