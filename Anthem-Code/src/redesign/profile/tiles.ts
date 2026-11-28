import type { ProfileWorkRow } from "@/server/queries/profilePage";

/** One work card on a profile: its cover at the picture's own ratio (never cropped). */
export type Tile = { id: string; title: string; cat: string; cover: string; ratio: number | null };

export const toTile = (w: ProfileWorkRow): Tile | null => {
  const cover = w.cover_url || w.gallery_urls?.[0] || "";
  if (!cover) return null;
  return {
    id: w.id,
    title: w.title?.trim() || "",
    cat: w.sc_category ?? "",
    cover,
    ratio: w.cover_width && w.cover_height ? w.cover_width / w.cover_height : null,
  };
};

/** Tools across the person's works, most used first (mock About: "เครื่องมือ"). */
export const toolsOf = (works: readonly ProfileWorkRow[]) => {
  const n = new Map<string, number>();
  for (const w of works) for (const t of w.tools ?? []) if (t?.trim()) n.set(t.trim(), (n.get(t.trim()) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t).join(", ");
};

export const count = (n: number) => n.toLocaleString("en-US");
