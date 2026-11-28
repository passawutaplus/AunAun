import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recordEventView } from "@/server/mutations/eventPage";
import { getEventPage, getEventVenues, getParentEvent } from "@/server/queries/eventPage";

const STALE = 5 * 60_000;

/** The event (or venue) of `/exhibition/:id`, by id or slug. */
export function useEventPage(idOrSlug: string | undefined) {
  return useQuery({ queryKey: ["sc-event", idOrSlug], queryFn: () => getEventPage(idOrSlug!), enabled: !!idOrSlug, staleTime: 60_000 });
}

export function useEventVenues(parentId: string | undefined) {
  return useQuery({ queryKey: ["sc-event-venues", parentId], queryFn: () => getEventVenues(parentId!), enabled: !!parentId, staleTime: STALE });
}

export function useParentEvent(parentId: string | null | undefined) {
  return useQuery({ queryKey: ["sc-event-parent", parentId], queryFn: () => getParentEvent(parentId!), enabled: !!parentId, staleTime: STALE });
}

/** Count one view per event per browser session, like the old page. */
export function useCountEventView(id: string | undefined, published: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!id || !published) return;
    const key = `event-viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still count */
    }
    void recordEventView(id)
      .then(() => qc.invalidateQueries({ queryKey: ["events", "stats"] }))
      .catch(() => undefined);
  }, [id, published, qc]);
}
