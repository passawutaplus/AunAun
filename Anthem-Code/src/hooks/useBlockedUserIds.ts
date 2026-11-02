import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { EMPTY_BLOCKED, fetchBlockedUserIds, withoutBlocked } from "@/lib/blockedUsers";

export const BLOCKED_USER_IDS_KEY = "blocked-user-ids";

/** Users the viewer must not see: blocked by the viewer, or who blocked the viewer. Empty when signed out. */
export const useBlockedUserIds = (): ReadonlySet<string> => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: [BLOCKED_USER_IDS_KEY, user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: () => fetchBlockedUserIds(user!.id),
  });
  return data ?? EMPTY_BLOCKED;
};

/** `select` for list queries of projects: drops works owned by blocked users (either direction). */
export const useWithoutBlockedOwners = () => {
  const blocked = useBlockedUserIds();
  return useCallback(
    <T extends { owner_id?: string | null }>(items: T[]): T[] =>
      withoutBlocked(items, blocked, (i) => i.owner_id),
    [blocked],
  );
};
