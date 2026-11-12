import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { EVENT_SELECT, isDemoEventId, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { withSlug } from "@/hooks/useExhibitionEvents";
import { roundCoord } from "@/lib/routeStart";
import { COMMON, tr } from "@/lib/i18n";
import { VENUES } from "@/lib/i18n/exhibition/venues";
import { featureActive, VENUE_SELECT, type EventVenue, type VenueDraft } from "@/lib/eventVenues";
import { invalidateEvents } from "@/hooks/useExhibitionEvents";

const eventsTable = () => supabase.from("events" as never);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

export type FeaturedEvent = ExhibitionEvent & { featured_until: string | null; interest_count: number };

/** The one pinned event for the top of /exhibition, or null (also null before the venues migration). */
export function useFeaturedEvent() {
  return useQuery({
    queryKey: ["events", "featured"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<FeaturedEvent | null> => {
      const { data, error } = await eventsTable()
        .select(`${EVENT_SELECT}, is_featured, featured_until, interest_count`)
        .eq("is_featured", true)
        .eq("status", "published")
        .maybeSingle();
      // Slug for the banner's links (separate so a database without the slug migration still shows the banner).
      if (data && !error) {
        const { data: s } = await eventsTable().select("slug").eq("id", (data as { id: string }).id).maybeSingle();
        if (s) (data as { slug?: string | null }).slug = (s as { slug?: string | null }).slug ?? null;
      }
      if (error || !data) return null;
      const row = data as FeaturedEvent & { is_featured: boolean };
      return featureActive(row) ? row : null;
    },
  });
}

/** Featured flag of one event, for the team editor. */
export function useEventFeature(id: string | null | undefined) {
  return useQuery({
    queryKey: ["events", "feature", id],
    enabled: !!id && !isDemoEventId(id),
    retry: false,
    queryFn: async () => {
      const { data, error } = await eventsTable().select("is_featured, featured_until").eq("id", id!).maybeSingle();
      if (error) return null;
      return data as { is_featured: boolean; featured_until: string | null } | null;
    },
  });
}

/** Venues (sub-events) of a main event, in list order. Empty before the venues migration. */
export function useEventVenues(parentId: string | null | undefined) {
  return useQuery({
    queryKey: ["events", "venues", parentId],
    enabled: !!parentId && !isDemoEventId(parentId),
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<EventVenue[]> => {
      const { data, error } = await withSlug((slugCol) =>
        eventsTable()
          .select(VENUE_SELECT + slugCol)
          .eq("parent_id", parentId!)
          .order("sort_order", { ascending: true }),
      );
      if (error) return [];
      return ((data ?? []) as EventVenue[]).map((v) => ({
        ...v,
        opening_hours: Array.isArray(v.opening_hours) ? v.opening_hours : [],
        gallery_urls: Array.isArray(v.gallery_urls) ? v.gallery_urls : [],
      }));
    },
  });
}

/** For a venue page: its main event (id + title), or null for a main event. */
export function useParentEvent(id: string | null | undefined) {
  return useQuery({
    queryKey: ["events", "parent-of", id],
    enabled: !!id && !isDemoEventId(id),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await eventsTable().select("parent_id").eq("id", id!).maybeSingle();
      const parentId = (data as { parent_id: string | null } | null)?.parent_id;
      if (error || !parentId) return null;
      const { data: p } = await withSlug((slugCol) =>
        eventsTable().select(`id, title, cover_url${slugCol}`).eq("id", parentId).maybeSingle(),
      );
      return (p as { id: string; slug?: string | null; title: string; cover_url: string | null } | null) ?? null;
    },
  });
}

/** "สนใจทั้งหมด" / "เลิกสนใจทั้งหมด" for every venue of a main event. */
export function useSetAllVenuesInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { parentId: string; on: boolean }) => {
      const { error } = await rpc("set_event_venues_interest", { _parent_id: v.parentId, _on: v.on });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["events", "my-interests"] });
      void qc.invalidateQueries({ queryKey: ["events", "venues"] });
      void qc.invalidateQueries({ queryKey: ["events", "stats"] });
      void qc.invalidateQueries({ queryKey: ["events", "my-list"] });
      toast.success(tr(v.on ? VENUES.allInterestedOn : VENUES.allInterestedOff));
    },
    onError: () => toast.error(tr(COMMON.saveFailed)),
  });
}

// ── Team ─────────────────────────────────────────────────────────────────────

export function useSetEventFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; on: boolean; until: string | null }) => {
      const { error } = await rpc("admin_set_event_featured", { _id: v.id, _on: v.on, _until: v.until });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidateEvents(qc);
      toast.success(v.on ? "ปักหมุดเป็นอีเวนต์เด่นแล้ว" : "เลิกปักหมุดแล้ว");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "อัปเดตไม่สำเร็จ")),
  });
}

export function useSaveVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { parentId: string; id: string | null; draft: VenueDraft }) => {
      const { data, error } = await rpc("admin_event_venue_save", { _parent_id: v.parentId, _id: v.id, _data: v.draft });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["events", "venues"] });
      toast.success("บันทึกสถานที่แล้ว");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "บันทึกไม่สำเร็จ")),
  });
}

export function useDeleteVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("admin_event_venue_delete", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["events", "venues"] });
      toast.success("ลบสถานที่แล้ว");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "ลบไม่สำเร็จ")),
  });
}

export function useReorderVenues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { parentId: string; ids: string[] }) => {
      const { error } = await rpc("admin_event_venues_reorder", { _parent_id: v.parentId, _ids: v.ids });
      if (error) throw error;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["events", "venues"] }),
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "เรียงลำดับไม่สำเร็จ")),
  });
}

export type VenueRoute = {
  /** [lng, lat] along streets, or the straight legs when routing is unavailable. */
  line: [number, number][];
  meters: number | null;
  seconds: number | null;
  /** True when it follows streets (OSRM walking); false = straight-line fallback. */
  streets: boolean;
};

async function osrmFoot(coords: string, signal?: AbortSignal): Promise<VenueRoute | null> {
  try {
    const res = await fetch(
      `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`,
      { signal },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>;
    };
    const r = json.code === "Ok" ? json.routes?.[0] : undefined;
    return r ? { line: r.geometry.coordinates, meters: r.distance, seconds: r.duration, streets: true } : null;
  } catch {
    return null;
  }
}

const straight = (pts: Array<{ lat: number; lng: number }>): VenueRoute => ({
  line: pts.map((p) => [p.lng, p.lat]),
  meters: null,
  seconds: null,
  streets: false,
});

export type VenueRoutePlan = {
  /** From the viewer's start point to the first ticked venue (shown dashed). */
  lead: VenueRoute | null;
  /** Between the ticked venues, in list order. */
  inner: VenueRoute | null;
};

/**
 * Walking route through the ticked venues, optionally from a start point (OSRM foot profile on
 * routing.openstreetmap.de; free, no key). The start point is rounded to ~100 m before it is sent.
 */
export function useVenueRoute(
  points: Array<{ lat: number | null; lng: number | null }>,
  start?: { lat: number; lng: number } | null,
) {
  const stops = points.filter((p): p is { lat: number; lng: number } => p.lat != null && p.lng != null);
  const fmt = (p: { lat: number; lng: number }) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`;
  const innerCoords = stops.map(fmt).join(";");
  const origin = start ? { lat: roundCoord(start.lat), lng: roundCoord(start.lng) } : null;
  const leadCoords = origin && stops.length ? `${fmt(origin)};${fmt(stops[0])}` : "";
  return useQuery({
    queryKey: ["venue-route", innerCoords, leadCoords],
    enabled: stops.length >= 2 || (!!origin && stops.length >= 1),
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }): Promise<VenueRoutePlan> => {
      const [inner, lead] = await Promise.all([
        stops.length >= 2 ? osrmFoot(innerCoords, signal).then((r) => r ?? straight(stops)) : Promise.resolve(null),
        origin && stops.length ? osrmFoot(leadCoords, signal).then((r) => r ?? straight([origin, stops[0]])) : Promise.resolve(null),
      ]);
      return { lead, inner };
    },
  });
}
