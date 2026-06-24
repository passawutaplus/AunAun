/**
 * React Query hook wrapping `getProfilesByIds`.
 * Use this in features/components — never call supabase directly.
 */
import { useQuery } from "@tanstack/react-query";
import { getProfilesByIds, indexProfiles, type ProfileLite } from "@/server/queries/profiles";

export function useProfilesByIds(ids: string[]) {
  const sortedIds = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["profiles", "by-ids", sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => getProfilesByIds(sortedIds),
    select: (data) => ({ list: data as ProfileLite[], map: indexProfiles(data) }),
  });
}
