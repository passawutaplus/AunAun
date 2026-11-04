import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bookmark, CalendarPlus, ExternalLink, Navigation, TrainFront, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMyEventInterests, useToggleEventInterest } from "@/hooks/useExhibitionEvents";
import { useSetAllVenuesInterest } from "@/hooks/useEventVenues";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { formatEventDates } from "@/lib/exhibitionEvents";
import {
  groupVenuesByArea,
  venueCounts,
  venueMapsUrl,
  venueOpenState,
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
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const counts = venueCounts(venues);
  const allOn = venues.length > 0 && venues.every((v) => interested.has(v.id));
  const pinned = useMemo(() => groups.flatMap((g) => g.venues), [groups]);
  const now = new Date();

  // /exhibition/<id>#venues or #venue-map (from the featured banner) once the list is here.
  useEffect(() => {
    const target = location.hash === "#venue-map" ? mapRef.current : location.hash === "#venues" ? sectionRef.current : null;
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

  const pageUrl = (id: string) => (typeof window !== "undefined" ? `${window.location.origin}/exhibition/${id}` : null);

  return (
    <section ref={sectionRef} id="venues" aria-labelledby="venues-heading" className={cn("scroll-mt-20", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="venues-heading" className="font-display text-2xl font-semibold text-foreground">
            สถานที่จัดงาน
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {counts.main} สถานที่{counts.special ? ` · โปรเจกต์พิเศษ ${counts.special}` : ""}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">จัดกลุ่มตามย่าน เดินต่อกันได้ · หมุดเป็นตำแหน่งโดยประมาณ</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("rounded-full", allOn && "border-brand text-brand hover:text-brand")}
          disabled={setAll.isPending}
          aria-pressed={allOn}
          onClick={() => requireUser() && setAll.mutate({ parentId: parent.id, on: !allOn })}
        >
          <Bookmark className={cn("h-4 w-4", allOn && "fill-current")} aria-hidden />
          {allOn ? "สนใจทุกที่แล้ว" : "สนใจทั้งหมด"}
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div ref={mapRef} id="venue-map" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted sm:h-80 lg:h-[34rem]" />}>
            <VenueMap
              venues={pinned}
              interested={interested}
              activeId={activeId}
              onSelect={selectFromMap}
              className="h-64 sm:h-80 lg:h-[34rem]"
            />
          </Suspense>
        </div>

        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.area ?? "-"}>
              {g.area ? (
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.area} <span className="font-normal">· {g.venues.length} ที่</span>
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
                          onClick={() => setActiveId(active ? null : v.id)}
                          aria-expanded={active}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                              on ? "bg-brand text-white" : "bg-muted-foreground/70 text-background",
                            )}
                            aria-hidden
                          >
                            {v.pin}
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
                        <div className="space-y-1.5 pb-3 pl-11 pr-3 text-xs text-muted-foreground">
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
                                <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Google Calendar
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
    </section>
  );
}
