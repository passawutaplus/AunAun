import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bookmark, Check, ChevronDown, ExternalLink, Map as MapIcon, Navigation, Route, TrainFront, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleCalendarIcon } from "@/components/icons/GoogleCalendarIcon";
import { useAuth } from "@/hooks/useAuth";
import { useMyEventInterests, useToggleEventInterest } from "@/hooks/useExhibitionEvents";
import { useSetAllVenuesInterest, useVenueRoute } from "@/hooks/useEventVenues";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { formatEventDates } from "@/lib/exhibitionEvents";
import {
  groupVenuesByArea,
  venueCounts,
  venueMapsUrl,
  venueOpenState,
  googleMapsRouteUrl,
  routeSummary,
  type EventVenue,
  type VenueOpenState,
} from "@/lib/eventVenues";
import { cn } from "@/lib/utils";

const VenueMap = lazy(() => import("./VenueMap"));

type Parent = { id: string; title: string; starts_on: string | null; ends_on: string | null };

const linkCls =
  "inline-flex min-h-8 items-center gap-1.5 text-xs text-muted-foreground underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

export function VenueOpenBadge({ state, className }: { state: VenueOpenState; className?: string }) {
  if (!state.label) return null;
  const on = state.kind === "open";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        on ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-emerald-500" : "bg-muted-foreground/60")} aria-hidden />
      {state.label}
    </span>
  );
}

/** Venues of a main event: pinned map (left / top) and the list grouped by area (right / below). */
export function EventVenuesSection({ parent, venues, className }: { parent: Parent; venues: EventVenue[]; className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const groups = useMemo(() => groupVenuesByArea(venues), [venues]);
  const ids = useMemo(() => venues.map((v) => v.id), [venues]);
  const { data: mine } = useMyEventInterests(ids);
  const interested = useMemo(() => mine ?? new Set<string>(), [mine]);
  const toggle = useToggleEventInterest();
  const setAll = useSetAllVenuesInterest();
  const [activeId, setActiveId] = useState<string | null>(null);
  // The whole venues block (map + list) folds away; "ดูเส้นทาง" (#venue-map) always opens it.
  const [mapOpen, setMapOpen] = useState(true);
  // "My route": venues ticked to visit, kept in this browser per event.
  const routeKey = `venue-route:${parent.id}`;
  const [picked, setPicked] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(routeKey) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });
  const togglePick = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(routeKey, JSON.stringify([...next]));
      } catch {
        /* storage blocked: keep it for this visit */
      }
      return next;
    });
  const clearPicks = () => {
    setPicked(new Set());
    try {
      localStorage.removeItem(routeKey);
    } catch {
      /* ignore */
    }
  };
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const counts = venueCounts(venues);
  const allOn = venues.length > 0 && venues.every((v) => interested.has(v.id));
  const pinned = useMemo(() => groups.flatMap((g) => g.venues), [groups]);
  const stops = useMemo(() => pinned.filter((v) => picked.has(v.id)), [pinned, picked]);
  const { data: route, isFetching: routing } = useVenueRoute(stops);
  const routeUrl = googleMapsRouteUrl(stops);
  const now = new Date();

  // /exhibition/<id>#venues or #venue-map (from the featured banner) once the list is here.
  useEffect(() => {
    if (location.hash === "#venue-map") setMapOpen(true);
    const target = location.hash === "#venues" || location.hash === "#venue-map" ? sectionRef.current : null;
    target?.scrollIntoView({ block: "start" });
  }, [location.hash, venues.length]);

  const requireUser = () => {
    if (user) return true;
    navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  };

  const selectFromMap = (id: string) => {
    setActiveId(id);
    rowRefs.current.get(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const allButton = (className: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("rounded-full", allOn && "border-brand text-brand hover:text-brand", className)}
      disabled={setAll.isPending}
      aria-pressed={allOn}
      onClick={() => requireUser() && setAll.mutate({ parentId: parent.id, on: !allOn })}
    >
      <Bookmark className={cn("h-4 w-4", allOn && "fill-current")} aria-hidden />
      {allOn ? "สนใจทุกที่แล้ว" : "สนใจทั้งหมด"}
    </Button>
  );

  const pageUrl = (id: string) => (typeof window !== "undefined" ? `${window.location.origin}/exhibition/${id}` : null);

  return (
    <section ref={sectionRef} id="venues" aria-labelledby="venues-heading" className={cn("scroll-mt-20", className)}>
      {/* Title left; fold toggle always top-right (phones too). "สนใจทั้งหมด" sits beside it on wider screens. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="venues-heading" className="font-display text-2xl font-semibold text-foreground">
            สถานที่จัดงาน
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {counts.main} สถานที่{counts.special ? ` · โปรเจกต์พิเศษ ${counts.special}` : ""}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">จัดกลุ่มตามย่าน เดินต่อกันได้ · หมุดเป็นตำแหน่งโดยประมาณ</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {allButton("hidden sm:inline-flex")}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            aria-expanded={mapOpen}
            aria-controls="venues-body"
            onClick={() => setMapOpen((o) => !o)}
          >
            <MapIcon className="h-4 w-4" aria-hidden />
            {mapOpen ? (
              "ซ่อน"
            ) : (
              <>
                <span className="sm:hidden">แสดง</span>
                <span className="hidden sm:inline">ดูแผนที่และ {venues.length} สถานที่</span>
              </>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", mapOpen && "rotate-180")} aria-hidden />
          </Button>
        </div>
      </div>
      {mapOpen ? allButton("mt-3 sm:hidden") : null}


      {mapOpen ? (
      <div
        id="venues-body"
        className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_27rem]"
      >
        <div ref={mapRef} id="venue-map" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted sm:h-80 lg:h-[34rem]" />}>
            <VenueMap
              venues={pinned}
              interested={interested}
              activeId={activeId}
              onSelect={selectFromMap}
              picked={picked}
              route={stops.length >= 2 ? route : null}
              className="h-64 sm:h-80 lg:h-[34rem]"
            />
          </Suspense>
        </div>

        <div className="space-y-6">
          {/* My route: on top of the venue list column. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted/40 px-3 py-2.5 text-sm" aria-live="polite">
            <Route className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            {stops.length < 2 ? (
              <span className="text-muted-foreground">ติ๊กสถานที่ที่จะไป ตั้งแต่ 2 ที่ขึ้นไป เพื่อดูเส้นทางเดินบนแผนที่</span>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  เส้นทางของคุณ · {stops.length} ที่
                  <span className="ml-2 font-normal text-muted-foreground">
                    {routing
                      ? "กำลังคำนวณเส้นทาง…"
                      : route?.meters != null && route.seconds != null
                        ? routeSummary(route.meters, route.seconds)
                        : "เส้นตรงโดยประมาณ (คำนวณตามถนนไม่ได้)"}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {routeUrl ? (
                    <a href={routeUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                      <Navigation className="h-3.5 w-3.5" aria-hidden /> เปิดเส้นทางใน Google Maps
                    </a>
                  ) : null}
                  <button type="button" onClick={clearPicks} className={linkCls}>
                    <X className="h-3.5 w-3.5" aria-hidden /> ล้าง
                  </button>
                </span>
              </>
            )}
          </div>
          {groups.map((g) => (
            <div key={g.area ?? "-"}>
              {g.area ? (
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {g.area} <span className="font-normal text-muted-foreground">· {g.venues.length} ที่</span>
                </h3>
              ) : null}
              <ol className="divide-y divide-border border-y border-border">
                {g.venues.map((v) => {
                  const on = interested.has(v.id);
                  const active = v.id === activeId;
                  const state = venueOpenState(v, now);
                  const ownDates =
                    v.date_note ??
                    (v.starts_on !== parent.starts_on || v.ends_on !== parent.ends_on
                      ? formatEventDates(v.starts_on, v.ends_on) || null
                      : null);
                  const gcal = googleCalendarLink({
                    title: `${v.title} · ${parent.title}`,
                    starts_on: v.starts_on,
                    ends_on: v.ends_on,
                    description: v.hours_note,
                    location_name: v.name_en || v.title,
                    location_note: v.address,
                    url: pageUrl(v.id),
                  });
                  return (
                    <li
                      key={v.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(v.id, el);
                        else rowRefs.current.delete(v.id);
                      }}
                      className={cn("relative transition-colors", active && "bg-muted/50")}
                    >
                      {active ? <span className="absolute inset-y-0 left-0 w-0.5 bg-brand" aria-hidden /> : null}
                      <div className="flex items-start gap-3 py-3 pl-2 pr-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={picked.has(v.id)}
                          aria-label={`${picked.has(v.id) ? "เอาออกจาก" : "เพิ่มใน"}เส้นทางของฉัน: ${v.title}`}
                          onClick={() => togglePick(v.id)}
                          className={cn(
                            "mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                            picked.has(v.id) ? "border-brand bg-brand text-white" : "border-foreground/30 hover:border-foreground",
                          )}
                        >
                          {picked.has(v.id) ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveId(active ? null : v.id)}
                          aria-expanded={active}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                        >
                          {/* Same pin as on the map: red = สนใจ. */}
                          <span className="relative -mt-0.5 h-7 w-[22px] shrink-0" aria-hidden>
                            <svg viewBox="0 0 28 36" className="absolute inset-0 h-full w-full">
                              <path
                                d="M14 1C7 1 1.5 6.4 1.5 13.3 1.5 22.6 14 35 14 35s12.5-12.4 12.5-21.7C26.5 6.4 21 1 14 1z"
                                className={on ? "fill-brand" : "fill-foreground/80"}
                              />
                            </svg>
                            <span
                              className={cn(
                                "absolute inset-x-0 top-[5px] text-center text-[10px] font-bold leading-3 tabular-nums",
                                on ? "text-white" : "text-background",
                              )}
                            >
                              {v.pin}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-medium text-foreground">{v.title}</span>
                              {v.is_special ? (
                                <span className="rounded-full border border-border px-1.5 text-[10px] text-muted-foreground">
                                  โปรเจกต์พิเศษ
                                </span>
                              ) : null}
                            </span>
                            {v.name_en && v.name_en !== v.title ? (
                              <span className="block truncate text-xs text-muted-foreground">{v.name_en}</span>
                            ) : null}
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <VenueOpenBadge state={state} />
                              {v.hours_note ? <span>{v.hours_note}</span> : null}
                              {ownDates ? <span className="text-foreground/80">{ownDates}</span> : null}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => requireUser() && toggle.mutate(v.id)}
                          disabled={toggle.isPending}
                          aria-pressed={on}
                          aria-label={on ? `เลิกสนใจ ${v.title}` : `สนใจ ${v.title} (เตือนก่อนเริ่ม)`}
                          title={on ? "สนใจแล้ว" : "สนใจ — เตือนก่อนเริ่ม 3 วันและ 1 วัน"}
                          className={cn(
                            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-50",
                            on && "text-brand hover:text-brand",
                          )}
                        >
                          <Bookmark className={cn("h-4 w-4", on && "fill-current")} aria-hidden />
                        </button>
                      </div>

                      {active ? (
                        <div className="space-y-1.5 pb-3 pl-[4.5rem] pr-3 text-xs text-muted-foreground">
                          {v.address ? <p>{v.address}</p> : null}
                          {v.closed_note ? <p>{v.closed_note}</p> : null}
                          {v.transit_note ? (
                            <p className="flex items-center gap-1.5">
                              <TrainFront className="h-3.5 w-3.5 shrink-0" aria-hidden /> {v.transit_note}
                            </p>
                          ) : null}
                          {v.admission_note || v.fee_type === "free" ? (
                            <p className="flex items-center gap-1.5">
                              <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden /> {v.admission_note ?? "เข้าชมฟรี"}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-x-4 pt-1">
                            <a href={venueMapsUrl(v)} target="_blank" rel="noopener noreferrer" className={linkCls}>
                              <Navigation className="h-3.5 w-3.5" aria-hidden /> เปิดใน Google Maps
                            </a>
                            {gcal ? (
                              <a href={gcal} target="_blank" rel="noopener noreferrer" className={linkCls}>
                                <GoogleCalendarIcon className="h-3.5 w-3.5" /> Google Calendar
                              </a>
                            ) : null}
                            {v.source_url ? (
                              <a href={v.source_url} target="_blank" rel="noopener noreferrer nofollow" className={linkCls}>
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> แหล่งข้อมูล
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </div>
      ) : null}
    </section>
  );
}
