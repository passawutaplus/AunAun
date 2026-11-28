import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { parseProfileVisibility } from "@/lib/profileVisibility";
import { getCreatorProfiles } from "@/server/queries/creators";
import { getHomeHiddenIds, getShowcaseRows } from "@/server/queries/showcase";
import { workSearchTextQuery } from "@/server/queries/siteSearch";
import { listedOnCreators } from "../lib/visibility";
import { matchesFind } from "./homeFind";

export const CREATOR_VIEWS = ["discover", "new", "following"] as const;
export type CreatorView = (typeof CREATOR_VIEWS)[number];

export type Creator = {
  id: string;
  name: string;
  /** Profile link: /@handle, or /u/<id> for a profile without a handle. */
  href: string;
  avatar: string;
  categories: string[];
  /** "CATEGORY · City" under the name. */
  sub: string;
  joinedAt: number;
  /** Up to four newest covers. */
  covers: string[];
  /** What the text filter (`?find=`) reads: name, handle, role, skills, categories, city, titles of their works. */
  words: string[];
};

/** Works looked at to find who has something on show. Enough for today's size; a database view comes with scale. */
const WORKS_SCANNED = 300;

/**
 * Creators = people with at least one work on the home page. Built from the same works the Showcase
 * shows (not hidden, not blocked), newest work first.
 */
export const homeWorksQuery = {
  queryKey: ["sc-creators"] as const,
  staleTime: 5 * 60_000,
  /** Works on the home page (newest first) and the public profiles of their owners; the search panel reads the same cache. */
  queryFn: async () => {
    const hidden = await getHomeHiddenIds();
    const works = await getShowcaseRows({ excludeIds: hidden }, 0, WORKS_SCANNED - 1);
    const owners = [...new Set(works.map((w) => w.owner_id).filter((id): id is string => !!id))];
    return { works, profiles: await getCreatorProfiles(owners) };
  },
};

export const profileHref = (p: { user_id: string; username: string | null }) =>
  p.username ? `/@${p.username}` : `/u/${p.user_id}`;

/** `find` (`?find=`) keeps the creators whose words or works (title, category, tags, tools) match: the old Creators search. */
export function useCreators(find = "") {
  const visible = useFeedProjectSelect();
  const q = find.trim();
  const words = useQuery({ ...workSearchTextQuery, enabled: !!q });
  const query = useQuery({
    ...homeWorksQuery,
    select: ({ works, profiles }): Creator[] => {
      const covers = new Map<string, string[]>();
      const titles = new Map<string, string[]>();
      for (const w of visible(works)) {
        if (w.owner_id) titles.set(w.owner_id, [...(titles.get(w.owner_id) ?? []), w.title ?? "", w.sc_category ?? ""]);
        const cover = w.cover_url || w.gallery_urls?.[0];
        if (!w.owner_id || !cover) continue;
        const list = covers.get(w.owner_id) ?? [];
        if (list.length < 4) list.push(cover);
        covers.set(w.owner_id, list);
      }
      return profiles.flatMap((p) => {
        // Settings → Privacy "โชว์โปรไฟล์ในหน้า Creators" off: the profile stays reachable by its link only.
        if (!listedOnCreators(p.public_visibility)) return [];
        const own = covers.get(p.user_id);
        if (!own?.length) return [];
        const categories = p.sc_categories ?? [];
        return [{
          id: p.user_id,
          name: p.display_name?.trim() || p.username || "",
          href: profileHref(p),
          avatar: p.avatar_url ?? "",
          categories,
          sub: [categories[0], p.location?.trim()].filter(Boolean).join(" · "),
          joinedAt: p.created_at ? Date.parse(p.created_at) : 0,
          covers: own,
          words: [
            p.display_name,
            p.username,
            p.role,
            ...(parseProfileVisibility(p.public_visibility).skills ? (p.skills ?? []) : []),
            ...categories,
            p.location,
            ...(titles.get(p.user_id) ?? []),
          ].filter((w): w is string => !!w),
        }];
      });
    },
  });

  const data = useMemo(() => {
    if (!q || !query.data) return query.data;
    // Tags and tools of each creator's works; without them the match falls back to the creator's own words.
    const more = new Map<string, string[]>();
    for (const w of words.data ?? []) {
      if (w.owner_id) more.set(w.owner_id, [...(more.get(w.owner_id) ?? []), ...(w.tags ?? []), ...(w.tools ?? [])]);
    }
    return query.data.filter((c) => matchesFind(q, [...c.words, ...(more.get(c.id) ?? [])]));
  }, [q, query.data, words.data]);

  return { ...query, data, isPending: query.isPending || (!!q && words.isPending) };
}
