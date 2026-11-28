import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { getHomeHiddenIds, getShowcaseRows } from "@/server/queries/showcase";

export type TouchWork = { id: string; src: string; ratio: number };

/** Same pool size as the mock (46 sample works). */
const POOL = 46;

/**
 * Real published works for the pictures of Get in Touch (mock: "รูปผลงานจริงของผู้ใช้ สุ่มทุกครั้ง").
 * Only works with a stored size, so every frame keeps the picture's own proportions (no cropping).
 * Works kept off the home page, of blocked people or hidden by the viewer are left out.
 * The order is shuffled once per visit.
 */
export function useTouchWorks(): TouchWork[] {
  const visible = useFeedProjectSelect();
  const hidden = useQuery({ queryKey: ["sc-home-hidden"], queryFn: getHomeHiddenIds, staleTime: 10 * 60_000 });
  const rows = useQuery({
    queryKey: ["sc-touch-works", hidden.data],
    enabled: !hidden.isPending,
    queryFn: () => getShowcaseRows({ excludeIds: hidden.data ?? [] }, 0, POOL - 1),
    staleTime: 5 * 60_000,
  });
  const [seed] = useState(() => Math.floor(Math.random() * 2147483646) + 1);

  return useMemo(() => {
    const list = visible(rows.data ?? []).flatMap((r) => {
      const src = r.cover_url || r.gallery_urls?.[0] || "";
      const ratio = r.cover_width && r.cover_height ? r.cover_width / r.cover_height : 0;
      return src && ratio ? [{ id: r.id, src, ratio }] : [];
    });
    // Fisher–Yates with a seed fixed for this visit, so a refetch does not reshuffle the page.
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [rows.data, visible, seed]);
}
