export type CommunityMediaAspect =
  | "square"
  | "portrait"
  | "portrait916"
  | "landscape"
  | "landscape54";

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
  portrait916: {
    label: "แนวตั้ง",
    ratioLabel: "9:16",
    ratio: 9 / 16,
    exportW: 1080,
    exportH: 1920,
    tailwind: "aspect-[9/16]",
    cropFrameClass: "aspect-[9/16]",
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
  landscape54: {
    label: "แนวนอน",
    ratioLabel: "5:4",
    ratio: 5 / 4,
    exportW: 1350,
    exportH: 1080,
    tailwind: "aspect-[5/4]",
    cropFrameClass: "aspect-[5/4]",
  },
};

export const COMMUNITY_MEDIA_ASPECT_ORDER: CommunityMediaAspect[] = [
  "square",
  "portrait",
  "portrait916",
  "landscape",
  "landscape54",
];

const KNOWN_ASPECTS = new Set<string>(COMMUNITY_MEDIA_ASPECT_ORDER);

export function normalizeCommunityMediaAspect(
  value: string | null | undefined,
): CommunityMediaAspect {
  if (value && KNOWN_ASPECTS.has(value)) return value as CommunityMediaAspect;
  return DEFAULT_COMMUNITY_MEDIA_ASPECT;
}

/** Minimum zoom so the whole image can fit inside the crop frame (react-easy-crop). */
export function communityCropMinZoom(
  mediaWidth: number,
  mediaHeight: number,
  cropAspect: number,
): number {
  if (!mediaWidth || !mediaHeight || !cropAspect) return 1;
  const mediaAspect = mediaWidth / mediaHeight;
  const fitZoom = mediaAspect > cropAspect ? cropAspect / mediaAspect : mediaAspect / cropAspect;
  return Math.min(1, Math.max(0.05, fitZoom));
}

export function communityMediaAspectMeta(aspect: CommunityMediaAspect): CommunityMediaAspectMeta {
  return COMMUNITY_MEDIA_ASPECTS[aspect];
}

export function communityMediaAspectTailwind(aspect: CommunityMediaAspect | undefined): string {
  return communityMediaAspectMeta(normalizeCommunityMediaAspect(aspect)).tailwind;
}

export function communityMediaStripThumbClass(aspect: CommunityMediaAspect | undefined): string {
  const key = normalizeCommunityMediaAspect(aspect);
  if (key === "portrait916") return "w-14 h-[4.95rem]";
  if (key === "portrait") return "w-16 h-20";
  if (key === "landscape54") return "w-[4.25rem] h-[3.4rem]";
  if (key === "landscape") return "w-[4.5rem] h-[2.55rem]";
  return "w-20 h-20";
}
