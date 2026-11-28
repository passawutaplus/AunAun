import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { eventPath } from "@/lib/exhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";
import type { HomeEventRow } from "@/server/queries/homeEvents";
import { homeWorksQuery, profileHref } from "../main/useCreators";
import { homeEventsQuery, isoDay } from "../main/useHomeEvents";
import { listedOnCreators } from "./visibility";

export type SearchKind = "CREATOR" | "WORK" | "EVENT";

export type SearchHit = {
  key: string;
  kind: SearchKind;
  name: string;
  href: string;
  thumb: string;
};

/** Mock (Main.dc.html): 3 creators, then 5 works, then 2 events. */
const LIMIT: Record<SearchKind, number> = { CREATOR: 3, WORK: 5, EVENT: 2 };

/** Starts-with before contains; otherwise the source order (newest work, nearest event) stays. */
function pick<T>(rows: T[], q: string, name: (r: T) => string, text: (r: T) => string, limit: number): T[] {
  const first: T[] = [];
  const rest: T[] = [];
  for (const r of rows) {
    if (first.length >= limit) break;
    const n = name(r).toLocaleLowerCase("th");
    if (n.startsWith(q)) first.push(r);
    else if (text(r).toLocaleLowerCase("th").includes(q)) rest.push(r);
  }
  return [...first, ...rest].slice(0, limit);
}

/**
 * Search panel results, matched in the browser over what the home page already loads: the works on the
 * home page (title, creator, category), their creators (name, handle, categories, city) and published
 * events (title, venue, area). Enough for today's size; a server search comes with scale.
 */
export function useSiteSearch(query: string) {
  const visible = useFeedProjectSelect();
  const home = useQuery(homeWorksQuery);
  const events = useQuery(homeEventsQuery);
  const q = query.trim().toLocaleLowerCase("th");

  const hits = useMemo((): SearchHit[] => {
    if (!q) return [];
    const works = visible(home.data?.works ?? []);
    const people = new Map((home.data?.profiles ?? []).map((p) => [p.user_id, p]));
    const nameOf = (id: string | null) => {
      const p = id ? people.get(id) : undefined;
      return p ? p.display_name?.trim() || p.username || "" : "";
    };
    const owners = new Set(works.map((w) => w.owner_id));
    const creators = [...people.values()].filter((p) => owners.has(p.user_id) && listedOnCreators(p.public_visibility));

    // Events that are on or still to come first (nearest start), then past ones (latest first).
    const today = isoDay(new Date());
    const live: HomeEventRow[] = [];
    const past: HomeEventRow[] = [];
    for (const e of events.data ?? []) ((e.ends_on ?? e.starts_on ?? "") >= today ? live : past).push(e);
    past.reverse();

    return [
      ...pick(
        creators,
        q,
        (p) => p.display_name?.trim() || p.username || "",
        (p) => [p.display_name, p.username, ...(p.sc_categories ?? []), p.location].filter(Boolean).join(" "),
        LIMIT.CREATOR,
      ).map((p) => ({
        key: "c" + p.user_id,
        kind: "CREATOR" as const,
        name: p.username || p.display_name?.trim() || "",
        href: profileHref(p),
        thumb: proxiedImageUrl(p.avatar_url, 64),
      })),
      ...pick(
        works,
        q,
        (w) => w.title ?? "",
        (w) => [w.title, nameOf(w.owner_id), w.sc_category].filter(Boolean).join(" "),
        LIMIT.WORK,
      ).map((w) => ({
        key: "w" + w.id,
        kind: "WORK" as const,
        name: w.title?.trim() || "Untitled",
        href: `/showcase/${w.id}`,
        thumb: proxiedImageUrl(w.cover_url || w.gallery_urls?.[0], 64),
      })),
      ...pick(
        [...live, ...past],
        q,
        (e) => e.title,
        (e) => [e.title, e.location_name, e.area].filter(Boolean).join(" "),
        LIMIT.EVENT,
      ).map((e) => ({
        key: "e" + e.id,
        kind: "EVENT" as const,
        name: e.title,
        href: eventPath(e),
        thumb: proxiedImageUrl(e.cover_url, 64),
      })),
    ];
  }, [q, home.data, events.data, visible]);

  return { hits, ready: !home.isLoading && !events.isLoading };
}
