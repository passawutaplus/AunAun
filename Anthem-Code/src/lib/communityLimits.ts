/** Area Post (community) media caps — same for all users; not tied to Pro/Free. */
export const COMMUNITY_MEDIA_MAX_IMAGES = 6;
export const COMMUNITY_MEDIA_MAX_VIDEOS = 2;
/** Images + videos combined per post. */
export const COMMUNITY_MEDIA_MAX_ITEMS = 6;

export type CommunityMediaLimits = {
  images: number;
  videos: number;
  total: number;
};

export function getCommunityMediaLimits(): CommunityMediaLimits {
  return {
    images: COMMUNITY_MEDIA_MAX_IMAGES,
    videos: COMMUNITY_MEDIA_MAX_VIDEOS,
    total: COMMUNITY_MEDIA_MAX_ITEMS,
  };
}

export function communityMediaCounts(galleryUrls: string[], videoUrls: string[]) {
  return {
    images: galleryUrls.length,
    videos: videoUrls.length,
    total: galleryUrls.length + videoUrls.length,
  };
}

export function canAddCommunityImage(imageCount: number, videoCount: number): boolean {
  return (
    imageCount < COMMUNITY_MEDIA_MAX_IMAGES &&
    imageCount + videoCount < COMMUNITY_MEDIA_MAX_ITEMS
  );
}

export function canAddCommunityVideo(imageCount: number, videoCount: number): boolean {
  return (
    videoCount < COMMUNITY_MEDIA_MAX_VIDEOS &&
    imageCount + videoCount < COMMUNITY_MEDIA_MAX_ITEMS
  );
}

export function communityMediaLimitMessage(
  kind: "image" | "video",
  imageCount: number,
  videoCount: number,
): string {
  if (imageCount + videoCount >= COMMUNITY_MEDIA_MAX_ITEMS) {
    return `Area Post ใส่สื่อได้ไม่เกิน ${COMMUNITY_MEDIA_MAX_ITEMS} ไฟล์/โพสต์ (รูป+วิดีโอรวมกัน)`;
  }
  if (kind === "image" && imageCount >= COMMUNITY_MEDIA_MAX_IMAGES) {
    return `อัปโหลดรูปได้สูงสุด ${COMMUNITY_MEDIA_MAX_IMAGES} รูป/โพสต์`;
  }
  if (kind === "video" && videoCount >= COMMUNITY_MEDIA_MAX_VIDEOS) {
    return `อัปโหลดวิดีโอได้สูงสุด ${COMMUNITY_MEDIA_MAX_VIDEOS} คลิป/โพสต์`;
  }
  return "ไม่สามารถเพิ่มสื่อได้";
}
