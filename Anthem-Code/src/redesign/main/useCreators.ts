import { useQuery } from "@tanstack/react-query";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { getCreatorProfiles } from "@/server/queries/creators";
import { getHomeHiddenIds, getShowcaseRows } from "@/server/queries/showcase";

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
};

/** Works looked at to find who has something on show. Enough for today's size; a database view comes with scale. */
const WORKS_SCANNED = 300;

/**
 * Creators = people with at least one work on the home page. Built from the same works the Showcase
 * shows (not hidden, not blocked), newest work first.
 */
export function useCreators() {
  const visible = useFeedProjectSelect();
  return useQuery({
    queryKey: ["sc-creators"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const hidden = await getHomeHiddenIds();
      const works = await getShowcaseRows({ excludeIds: hidden }, 0, WORKS_SCANNED - 1);
      const owners = [...new Set(works.map((w) => w.owner_id).filter((id): id is string => !!id))];
      return { works, profiles: await getCreatorProfiles(owners) };
    },
    select: ({ works, profiles }): Creator[] => {
      const covers = new Map<string, string[]>();
      for (const w of visible(works)) {
        const cover = w.cover_url || w.gallery_urls?.[0];
        if (!w.owner_id || !cover) continue;
        const list = covers.get(w.owner_id) ?? [];
        if (list.length < 4) list.push(cover);
        covers.set(w.owner_id, list);
      }
      return profiles.flatMap((p) => {
        const own = covers.get(p.user_id);
        if (!own?.length) return [];
        const categories = p.sc_categories ?? [];
        return [{
          id: p.user_id,
          name: p.display_name?.trim() || p.username || "",
          href: p.username ? `/@${p.username}` : `/u/${p.user_id}`,
          avatar: p.avatar_url ?? "",
          categories,
          sub: [categories[0], p.location?.trim()].filter(Boolean).join(" · "),
          joinedAt: p.created_at ? Date.parse(p.created_at) : 0,
          covers: own,
        }];
      });
    },
  });
}
