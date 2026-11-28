import type { ExploreRow } from "@/server/queries/explore";

export type ExploreKind = "tag" | "tool";
export type ExploreSort = "new" | "views" | "likes";

/** Old URLs stay: /explore/tag/:value and /explore/tool/:value (lib/exploreRoutes). */
export const exploreHref = (kind: ExploreKind, value: string) => `/explore/${kind}/${encodeURIComponent(value.trim().replace(/^#+/, ""))}`;

/** The pictures of one work that look like this picture (old page, new look). */
export const similarHref = (workId: string, imageUrl?: string, index?: number) => {
  const q = new URLSearchParams();
  if (imageUrl) q.set("src", imageUrl);
  if (index) q.set("img", String(index));
  const s = q.toString();
  return `/similar/${workId}${s ? `?${s}` : ""}`;
};

const norm = (s: string) => s.trim().replace(/^#+/, "").toLocaleLowerCase("th");

/**
 * Works with this tag or tool, best match first (as the old explore page): a tag matches exactly or
 * as part of a longer tag ("riso" ↔ "risograph"); a tool matches exactly, letter case aside.
 */
export function filterExplore(rows: readonly ExploreRow[], kind: ExploreKind, value: string, sort: ExploreSort): ExploreRow[] {
  const v = norm(value);
  if (!v) return [];
  const scored: Array<{ r: ExploreRow; s: number }> = [];
  for (const r of rows) {
    const list = (kind === "tag" ? r.tags : r.tools) ?? [];
    let s = 0;
    for (const raw of list) {
      const t = norm(raw ?? "");
      if (!t) continue;
      if (t === v) s = Math.max(s, 3);
      else if (kind === "tag" && (t.includes(v) || v.includes(t))) s = Math.max(s, 2);
    }
    if (s) scored.push({ r, s });
  }
  const by = (a: { r: ExploreRow; s: number }, b: { r: ExploreRow; s: number }) => {
    if (sort === "views") return (b.r.views ?? 0) - (a.r.views ?? 0);
    if (sort === "likes") return (b.r.likes ?? 0) - (a.r.likes ?? 0);
    // Newest: exact matches first, then the rest, each newest first.
    return b.s - a.s || b.r.created_at.localeCompare(a.r.created_at);
  };
  return scored.sort(by).map((x) => x.r);
}
