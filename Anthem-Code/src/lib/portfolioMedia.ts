export type PortfolioMediaKind = "image" | "video";

export interface PortfolioMediaItem {
  id: string;
  kind: PortfolioMediaKind;
  url: string;
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?|$)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url);
}

export function mediaItemFromUrl(url: string): PortfolioMediaItem {
  const kind: PortfolioMediaKind = isVideoUrl(url) ? "video" : "image";
  return { id: `${kind}:${url}`, kind, url };
}

/** Build editor media list from DB fields (supports legacy split arrays). */
export function mediaItemsFromProject(galleryUrls: string[], videoUrls: string[]): PortfolioMediaItem[] {
  const gallery = galleryUrls ?? [];
  const videos = videoUrls ?? [];
  const hasVideosInGallery = gallery.some(isVideoUrl);

  if (hasVideosInGallery) {
    return gallery.map(mediaItemFromUrl);
  }

  const orphanVideos = videos.filter((v) => !gallery.includes(v));
  return [
    ...gallery.map(mediaItemFromUrl),
    ...orphanVideos.map(mediaItemFromUrl),
  ];
}

export function splitMediaItems(items: PortfolioMediaItem[]): {
  gallery_urls: string[];
  video_urls: string[];
} {
  const orderedUrls = items.map((m) => m.url);
  return {
    gallery_urls: orderedUrls,
    video_urls: items.filter((m) => m.kind === "video").map((m) => m.url),
  };
}

export function countMediaByKind(items: PortfolioMediaItem[], kind: PortfolioMediaKind): number {
  return items.filter((m) => m.kind === kind).length;
}

/** Reorder image items per AI indices; videos keep their slots. */
export function applyImageOrderToMedia(
  items: PortfolioMediaItem[],
  imageOrder: number[],
): PortfolioMediaItem[] {
  const images = items.filter((m) => m.kind === "image");
  const reordered = imageOrder.map((i) => images[i]).filter(Boolean);
  if (reordered.length !== images.length) return items;

  let imgPtr = 0;
  return items.map((item) => {
    if (item.kind === "video") return item;
    return reordered[imgPtr++] ?? item;
  });
}

export function imageUrlsFromMedia(items: PortfolioMediaItem[]): string[] {
  return items.filter((m) => m.kind === "image").map((m) => m.url);
}
