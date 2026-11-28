import { useQuery } from "@tanstack/react-query";
import { getHomeEvents, type HomeEventRow } from "@/server/queries/homeEvents";

/** "all" (owner 2026-11-28): every event that has not ended, by start day — Now alone often showed nothing. */
export const EVENT_VIEWS = ["all", "now", "week", "upcoming", "past"] as const;
export type EventView = (typeof EVENT_VIEWS)[number];
export const EVENT_VIEW_LABEL: Record<EventView, string> = { all: "All", now: "Now", week: "This Week", upcoming: "Upcoming", past: "Past" };

/** Type chips of the mock, in its order. "highlight" is not a category: it shows the highlight alone. */
export const EVENT_TYPES = [
  ["highlight", "Highlight"],
  ["open_call", "Open Call"],
  ["exhibition", "Exhibition"],
  ["workshop", "Workshop"],
  ["talk_forum", "Talk"],
  ["art_fair", "Art Fair"],
  ["meetup", "Meetup"],
] as const;
export type EventType = (typeof EVENT_TYPES)[number][0];
export const isEventType = (v: string | null): v is EventType => EVENT_TYPES.some(([k]) => k === v);

/** Small caps label over an event. "other" has no label in the mock yet (question for Beam). */
export const EVENT_KIND: Record<string, string> = {
  open_call: "OPEN CALL",
  exhibition: "EXHIBITION",
  workshop: "WORKSHOP",
  talk_forum: "TALK",
  art_fair: "ART FAIR",
  meetup: "MEETUP",
  other: "OTHER",
};

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** A stored date (YYYY-MM-DD) as a local day, never shifted by the time zone. */
export const dayOf = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const monthCaps = (iso: string) => MONTHS[dayOf(iso).getMonth()].toUpperCase();
export const weekdayDay = (iso: string) => `${WEEKDAYS[dayOf(iso).getDay()]} ${dayOf(iso).getDate()}`;
/** "28 Feb", with the year when it is not this year. */
export const shortDate = (iso: string, withYear = dayOf(iso).getFullYear() !== new Date().getFullYear()) => {
  const d = dayOf(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
};

export const lastDay = (e: Pick<HomeEventRow, "starts_on" | "ends_on">) => e.ends_on ?? e.starts_on;

/** Monday and Sunday of the week of `today` (YYYY-MM-DD). */
export function weekOf(today: string): [string, string] {
  const now = dayOf(today);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [isoDay(monday), isoDay(sunday)];
}

/** Which events a time view shows (owner 2026-11-27): Now = running today; the others go by start day. */
export function inView(e: HomeEventRow, view: EventView, today = isoDay(new Date())): boolean {
  if (!e.starts_on) return false;
  const end = lastDay(e)!;
  if (view === "all") return end >= today;
  if (view === "now") return e.starts_on <= today && end >= today;
  if (view === "upcoming") return e.starts_on > today;
  if (view === "past") return end < today;
  const [monday, sunday] = weekOf(today);
  return e.starts_on >= monday && e.starts_on <= sunday;
}

/** Days a view covers, under the month (owner 2026-11-28): Now = "Today · 28 Nov", This Week = "23 – 29 Nov". */
export function viewDays(view: EventView, today: string): string | null {
  const day = (iso: string, month = true) => `${dayOf(iso).getDate()}${month ? ` ${MONTHS[dayOf(iso).getMonth()]}` : ""}`;
  if (view === "now") return `Today · ${day(today)}`;
  if (view !== "week") return null;
  const [mon, sun] = weekOf(today);
  return `${day(mon, mon.slice(0, 7) !== sun.slice(0, 7))} – ${day(sun)}`;
}

export type HomeEvents = { events: HomeEventRow[]; venues: Map<string, HomeEventRow[]> };

/** Published events for the Event tab: top-level events, plus the venues of multi-venue events by parent. */
/** Shared with the search panel. */
export const homeEventsQuery = { queryKey: ["sc-home-events"] as const, staleTime: 5 * 60_000, queryFn: getHomeEvents };

export function useHomeEvents() {
  return useQuery({
    ...homeEventsQuery,
    select: (rows): HomeEvents => {
      const venues = new Map<string, HomeEventRow[]>();
      for (const r of rows) {
        if (!r.parent_id) continue;
        venues.set(r.parent_id, [...(venues.get(r.parent_id) ?? []), r]);
      }
      for (const list of venues.values()) list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return { events: rows.filter((r) => !r.parent_id), venues };
    },
  });
}
