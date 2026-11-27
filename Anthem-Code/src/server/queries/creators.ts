import { profilesPublicFrom } from "@/lib/profileAccess";

export type CreatorProfileRow = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  created_at: string | null;
  /** The 22-CATEGORY list of the new design (in profiles_public since migration 20261127200000). */
  sc_categories: string[] | null;
};

/** Public profiles of the given people, for the Creators tab of the new home page. */
export async function getCreatorProfiles(ids: readonly string[]): Promise<CreatorProfileRow[]> {
  if (!ids.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (profilesPublicFrom() as any)
    .select("user_id, display_name, username, avatar_url, location, created_at, sc_categories")
    .in("user_id", ids);
  if (error) throw error;
  return (data ?? []) as CreatorProfileRow[];
}
