import { useMemo } from "react";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import type { TileWork } from "../main/WorkTile";

type Row = {
  id: string;
  title: string | null;
  cover_url: string | null;
  gallery_urls?: string[] | null;
  owner_id: string | null;
  cover_width?: number | null;
  cover_height?: number | null;
  sc_category?: string | null;
};

/** Rows of works as home-grid tiles ("Category · Artist"), like Main's Showcase. `cover` overrides the work's cover (similar pictures). */
export function useTiles(rows: ReadonlyArray<Row & { picture?: string; ratio?: number | null }>): TileWork[] {
  const owners = useMemo(() => [...new Set(rows.map((r) => r.owner_id).filter((id): id is string => !!id))], [rows]);
  const { data: profiles } = useProfilesByIds(owners);
  return useMemo(
    () =>
      rows.flatMap((r) => {
        const cover = r.picture || r.cover_url || r.gallery_urls?.[0] || "";
        if (!cover) return [];
        const who = r.owner_id ? profiles?.map[r.owner_id] : undefined;
        const artist = who?.display_name?.trim() || who?.username || "";
        const ratio = r.picture ? r.ratio ?? null : r.cover_width && r.cover_height ? r.cover_width / r.cover_height : null;
        return [{ id: r.id, title: r.title?.trim() || "", artist, sub: [r.sc_category, artist].filter(Boolean).join(" · "), cover, ratio }];
      }),
    [rows, profiles],
  );
}
