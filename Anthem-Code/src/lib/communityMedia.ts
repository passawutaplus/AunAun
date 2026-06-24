import { isVideoUrl, type PortfolioMediaItem } from "@/lib/portfolioMedia";

export function communityMediaFromPost(galleryUrls: string[] = [], videoUrls: string[] = []): PortfolioMediaItem[] {
  const gallery = galleryUrls ?? [];
  const videos = videoUrls ?? [];
  if (gallery.some(isVideoUrl)) return gallery.map((url) => ({ id: `m:${url}`, kind: isVideoUrl(url) ? "video" : "image", url }));
  const orphanVideos = videos.filter((v) => !gallery.includes(v));
  return [
    ...gallery.map((url) => ({ id: `m:${url}`, kind: "image" as const, url })),
    ...orphanVideos.map((url) => ({ id: `m:${url}`, kind: "video" as const, url })),
  ];
}

export function splitCommunityMedia(items: PortfolioMediaItem[]) {
  const ordered = items.map((m) => m.url);
  return {
    gallery_urls: ordered,
    video_urls: items.filter((m) => m.kind === "video").map((m) => m.url),
  };
}

export function communityCoverUrl(galleryUrls: string[] = [], videoUrls: string[] = []): string | null {
  const items = communityMediaFromPost(galleryUrls, videoUrls);
  return items[0]?.url ?? null;
}

export function communityHeroImageUrl(galleryUrls: string[] = [], videoUrls: string[] = []): string | null {
  const items = communityMediaFromPost(galleryUrls, videoUrls);
  const image = items.find((m) => m.kind === "image");
  return image?.url ?? null;
}
