import type { Tier } from "@/core/subscription/useSubscription";

export const COMMUNITY_MEDIA_LIMITS: Record<Tier, { images: number; videos: number }> = {
  free: { images: 9, videos: 1 },
  pro: { images: 20, videos: 3 },
  pro_plus: { images: 20, videos: 3 },
  inhouse: { images: 20, videos: 3 },
};

export function getCommunityMediaLimits(tier: Tier) {
  return COMMUNITY_MEDIA_LIMITS[tier] ?? COMMUNITY_MEDIA_LIMITS.free;
}
