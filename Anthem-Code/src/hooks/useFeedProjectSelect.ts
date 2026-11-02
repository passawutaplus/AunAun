import { useCallback } from "react";
import { useWithoutBlockedOwners } from "./useBlockedUserIds";
import { useHiddenProjectIds } from "./useHiddenProjectIds";

/**
 * `select` for project feed queries: drops works by blocked users (either direction) and works
 * this viewer hid with "ซ่อนผลงานนี้", so a hidden work disappears from the feed, not just its page.
 */
export const useFeedProjectSelect = () => {
  const withoutBlocked = useWithoutBlockedOwners();
  const hidden = useHiddenProjectIds();
  return useCallback(
    <T extends { id?: string | null; owner_id?: string | null }>(items: T[]): T[] => {
      const kept = withoutBlocked(items);
      return hidden.size ? kept.filter((i) => !i.id || !hidden.has(i.id)) : kept;
    },
    [withoutBlocked, hidden],
  );
};
