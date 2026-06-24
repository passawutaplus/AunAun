import type { AdCampaign } from "@/hooks/useAds";

export type FeedItem<T> =
  | { kind: "project"; data: T; key: string }
  | { kind: "ad"; data: AdCampaign; key: string };

/**
 * Interleave ads into a project list at semi-random positions.
 * - First ad shows after `minGap` items
 * - Subsequent ads spaced `minGap`..`maxGap` items apart
 * - Caps at the number of available ads
 */
export function interleaveAds<T extends { id: string }>(
  projects: T[],
  ads: AdCampaign[],
  opts: { minGap?: number; maxGap?: number } = {}
): FeedItem<T>[] {
  const minGap = opts.minGap ?? 8;
  const maxGap = opts.maxGap ?? 14;
  if (!ads.length || projects.length < minGap) {
    return projects.map((p) => ({ kind: "project" as const, data: p, key: p.id }));
  }
  const out: FeedItem<T>[] = [];
  let adIdx = 0;
  let nextAdAt = minGap + Math.floor(Math.random() * (maxGap - minGap + 1));
  projects.forEach((p, i) => {
    out.push({ kind: "project", data: p, key: p.id });
    if (i + 1 === nextAdAt && adIdx < ads.length) {
      const ad = ads[adIdx++];
      out.push({ kind: "ad", data: ad, key: `ad-${ad.id}-${i}` });
      nextAdAt = i + 1 + minGap + Math.floor(Math.random() * (maxGap - minGap + 1));
    }
  });
  return out;
}
