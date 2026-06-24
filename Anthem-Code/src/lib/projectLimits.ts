import type { Tier } from "@/core/subscription/useSubscription";

export const PROJECT_LIMITS: Record<
  Tier,
  { published: number; draft: number; galleryImages: number; videosPerProject: number }
> = {
  free: { published: 15, draft: 5, galleryImages: 6, videosPerProject: 1 },
  pro: { published: Infinity, draft: 50, galleryImages: 20, videosPerProject: 3 },
  pro_plus: { published: Infinity, draft: 50, galleryImages: 20, videosPerProject: 3 },
  inhouse: { published: Infinity, draft: 100, galleryImages: 20, videosPerProject: 3 },
};

export function getProjectLimits(tier: Tier) {
  return PROJECT_LIMITS[tier] ?? PROJECT_LIMITS.free;
}
