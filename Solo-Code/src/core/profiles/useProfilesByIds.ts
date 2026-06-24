/**
 * Shared profile batch-fetch hook.
 * Dedupes multiple components asking for the same set of profile ids
 * by going through a single React Query cache entry.
 *
 * Usage:
 *   const { data: profiles } = useProfilesByIds(["uuid1", "uuid2"]);
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfilesByIds, type ProfileLite } from "@/server/queries/profiles";

export type { ProfileLite };

export function useProfilesByIds(ids: readonly string[] | undefined) {
  const sorted = [...new Set(ids ?? [])].sort();
  return useQuery({
    queryKey: ["profiles-by-ids", sorted],
    queryFn: () => getProfilesByIds(sorted, supabase),
    enabled: sorted.length > 0,
    staleTime: 60_000,
  });
}
