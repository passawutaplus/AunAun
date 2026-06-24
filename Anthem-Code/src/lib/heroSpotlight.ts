import { todayISO } from "@/lib/dailySeedPick.vendored";

type WithCover = {
  id: string;
  cover_url?: string | null;
  gallery_urls?: string[] | null;
  views?: number | null;
};

export function projectCoverUrl(p: WithCover): string {
  return p.cover_url?.trim() || p.gallery_urls?.find((u) => u?.trim()) || "";
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Pick one item from the top N by views (stable pseudo-random per seed). */
export function pickFromTopByViews<T extends WithCover>(
  items: T[],
  seed: string,
  topN = 5,
): T | null {
  const withCover = items.filter((p) => projectCoverUrl(p));
  if (!withCover.length) return null;
  const top = [...withCover].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, topN);
  return top[hashSeed(seed) % top.length] ?? top[0];
}

export const heroPickSeed = (entityId: string) => `${entityId}:${todayISO()}`;

export type HeroSpotlightSlide = {
  id: string;
  name: string;
  backgroundCover: string;
  avatarUrl: string | null;
  profileHref: string;
  projectHref: string;
  projectTitle: string;
};
