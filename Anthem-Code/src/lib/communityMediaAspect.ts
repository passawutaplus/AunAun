export type CommunityMediaAspect = "square" | "portrait" | "landscape";

export const DEFAULT_COMMUNITY_MEDIA_ASPECT: CommunityMediaAspect = "square";

export type CommunityMediaAspectMeta = {
  label: string;
  ratioLabel: string;
  ratio: number;
  exportW: number;
  exportH: number;
  tailwind: string;
  cropFrameClass: string;
};

export const COMMUNITY_MEDIA_ASPECTS: Record<CommunityMediaAspect, CommunityMediaAspectMeta> = {
  square: {
    label: "จัตุรัส",
    ratioLabel: "1:1",
    ratio: 1,
    exportW: 1080,
    exportH: 1080,
    tailwind: "aspect-square",
    cropFrameClass: "aspect-square",
  },
  portrait: {
    label: "แนวตั้ง",
    ratioLabel: "4:5",
    ratio: 4 / 5,
    exportW: 1080,
    exportH: 1350,
    tailwind: "aspect-[4/5]",
    cropFrameClass: "aspect-[4/5]",
  },
  landscape: {
    label: "แนวนอน",
    ratioLabel: "16:9",
    ratio: 16 / 9,
    exportW: 1920,
    exportH: 1080,
    tailwind: "aspect-video",
    cropFrameClass: "aspect-video",
  },
};

export const COMMUNITY_MEDIA_ASPECT_ORDER: CommunityMediaAspect[] = [
  "square",
  "portrait",
  "landscape",
];

export function normalizeCommunityMediaAspect(
  value: string | null | undefined,
): CommunityMediaAspect {
  if (value === "portrait" || value === "landscape") return value;
  return DEFAULT_COMMUNITY_MEDIA_ASPECT;
}

export function communityMediaAspectMeta(aspect: CommunityMediaAspect): CommunityMediaAspectMeta {
  return COMMUNITY_MEDIA_ASPECTS[aspect];
}

export function communityMediaAspectTailwind(aspect: CommunityMediaAspect | undefined): string {
  return communityMediaAspectMeta(normalizeCommunityMediaAspect(aspect)).tailwind;
}

export function communityMediaStripThumbClass(aspect: CommunityMediaAspect | undefined): string {
  const key = normalizeCommunityMediaAspect(aspect);
  if (key === "portrait") return "w-16 h-20";
  if (key === "landscape") return "w-[4.5rem] h-[2.55rem]";
  return "w-20 h-20";
}
