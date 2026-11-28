import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchEvents, type EventSearchArgs, type EventSearchHit } from "@/server/queries/eventSearch";
import type { HomeEventRow } from "@/server/queries/homeEvents";
import { parseEventIntent, type EventIntent } from "./eventIntent";
import { placeTerms, provincesNear, type Province } from "./thaiProvinces";
import { isoDay, lastDay } from "./useHomeEvents";

/* ------------------------------------------------------------------ near me */

export type Near = { status: "idle" | "asking" | "ok" | "failed"; provinces: Province[] };

// One position per visit: asking again on every keystroke would re-open the permission prompt.
let knownNear: Province[] | null = null;

/** Where the device is, as provinces, once the sentence says "ใกล้ฉัน" (events have no coordinates yet). */
export function useNearProvinces(wanted: boolean): Near {
  const [near, setNear] = useState<Near>(() => (knownNear ? { status: "ok", provinces: knownNear } : { status: "idle", provinces: [] }));
  useEffect(() => {
    if (!wanted || near.status !== "idle") return;
    if (!("geolocation" in navigator) || window.isSecureContext === false) {
      setNear({ status: "failed", provinces: [] });
      return;
    }
    setNear({ status: "asking", provinces: [] });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        knownNear = provincesNear(pos.coords.latitude, pos.coords.longitude);
        setNear({ status: "ok", provinces: knownNear });
      },
      () => setNear({ status: "failed", provinces: [] }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }, [wanted, near.status]);
  return near;
}

/* ------------------------------------------------------------------ args */

/** The server filters for a sentence. A chosen type tab counts when the sentence names no type. */
export function searchArgs(intent: EventIntent, near: Province[], typeTab: string | null): EventSearchArgs {
  const provinces = [...intent.provinces, ...(intent.nearMe ? near : [])];
  return {
    keywords: intent.keywords,
    boost: intent.boost,
    categories: intent.categories.length ? intent.categories : typeTab ? [typeTab] : [],
    places: [...new Set(provinces.flatMap(placeTerms))],
    free: intent.free,
    from: intent.range?.from ?? null,
    to: intent.range?.to ?? null,
  };
}

/* ------------------------------------------------------------------ browser fallback */

/**
 * The same ranking as public.event_search over what the Event tab already loaded (titles and places only,
 * no descriptions). Used until the owner runs migration 20261129150000.
 */
export function rankLocally(rows: HomeEventRow[], a: EventSearchArgs, today = isoDay(new Date())): EventSearchHit[] {
  const lower = (...v: (string | null | undefined)[]) => v.filter(Boolean).join(" ").toLowerCase();
  const scored = rows
    .filter((e) => !e.parent_id && e.starts_on && (lastDay(e) ?? "") >= today)
    .map((e) => {
      const title = lower(e.title);
      const hay = lower(e.title, e.location_name, e.area);
      const catOk = !a.categories.length || a.categories.includes(e.category);
      const placeOk =
        !a.places.length ||
        a.places.some((p) => p && hay.includes(p.toLowerCase())) ||
        (e.category === "open_call" &&
          (!a.categories.length || a.categories.includes("open_call")) &&
          /(ทั่วประเทศ|ออนไลน์|online)/.test(hay));
      const dateOk = (!a.from || lastDay(e)! >= a.from) && (!a.to || e.starts_on! <= a.to);
      const freeOk = !a.free || e.fee_type === "free";
      let hits = 0;
      let kw = 0;
      for (const item of a.keywords) {
        const words = item.toLowerCase().split("|").filter(Boolean);
        const s = words.some((w) => title.includes(w)) ? 2 : words.some((w) => hay.includes(w)) ? 1 : 0;
        if (s) hits++;
        kw += s;
      }
      const boost = a.boost.filter((b) => hay.includes(b.toLowerCase())).length;
      const exact = catOk && placeOk && dateOk && freeOk && hits === a.keywords.length;
      const score = (placeOk ? 3 : 0) + (dateOk ? 2 : 0) + (catOk ? 2 : 0) + (freeOk ? 1 : 0) + kw + 0.5 * boost;
      const soon = e.starts_on! > today ? e.starts_on! : today;
      return { id: e.id, score, exact, soon, end: lastDay(e)! };
    });
  const anyExact = scored.some((s) => s.exact);
  return scored
    .filter((s) => s.exact || !anyExact)
    .sort((x, y) => Number(y.exact) - Number(x.exact) || y.score - x.score || x.soon.localeCompare(y.soon) || x.end.localeCompare(y.end))
    .slice(0, anyExact ? 60 : 12)
    .map(({ id, score, exact }) => ({ id, score, exact }));
}

/* ------------------------------------------------------------------ hook */

export type EventSearch = {
  intent: EventIntent;
  near: Near;
  /** Events to show, best first; `exact` false = nothing matched everything, these are the nearest. */
  events: HomeEventRow[];
  exact: boolean;
  loading: boolean;
};

export function useEventSearch(q: string, rows: HomeEventRow[] | undefined, typeTab: string | null): EventSearch | null {
  const today = isoDay(new Date());
  const intent = useMemo(() => parseEventIntent(q, today), [q, today]);
  const near = useNearProvinces(intent.nearMe);
  const active = !!q.trim();
  const args = useMemo(() => searchArgs(intent, near.provinces, typeTab), [intent, near.provinces, typeTab]);

  const res = useQuery({
    queryKey: ["sc-event-search", args],
    queryFn: () => searchEvents(args),
    enabled: active && !(intent.nearMe && near.status === "asking"),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return useMemo(() => {
    if (!active) return null;
    const list = rows ?? [];
    const byId = new Map(list.map((e) => [e.id, e]));
    // `null` = the server search is not there yet: rank in the browser.
    const hits = res.data === null || res.isError ? rankLocally(list, args, today) : (res.data ?? []);
    const events = hits.map((h) => byId.get(h.id)).filter((e): e is HomeEventRow => !!e);
    return {
      intent,
      near,
      events,
      exact: hits.length > 0 && hits[0].exact,
      loading: res.isPending && res.fetchStatus !== "idle",
    };
  }, [active, rows, res.data, res.isError, res.isPending, res.fetchStatus, args, today, intent, near]);
}
