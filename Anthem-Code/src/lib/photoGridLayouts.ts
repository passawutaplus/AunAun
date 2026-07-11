export type PhotoGridLayout =
  | "two_stack"
  | "two_side"
  | "three_split"
  | "three_split_rev"
  | "four_quad";

/** Layouts shown in the editor picker (2-up removed — use ภาพหลายรูป instead). */
export const PHOTO_GRID_LAYOUTS: {
  id: PhotoGridLayout;
  label: string;
  description: string;
  slots: number;
}[] = [
  {
    id: "three_split",
    label: "3 ภาพ",
    description: "ซ้ายเต็มสูง · ขวาบน-ล่าง 1:1",
    slots: 3,
  },
  {
    id: "three_split_rev",
    label: "3 ภาพ สลับฝั่ง",
    description: "ซ้ายบน-ล่าง · ขวาเต็มสูง",
    slots: 3,
  },
  {
    id: "four_quad",
    label: "4 ภาพ ตาราง",
    description: "ตาราง 2×2 สี่เหลี่ยมจัตุรัส",
    slots: 4,
  },
];

const SLOT_COUNT: Record<PhotoGridLayout, number> = {
  two_stack: 2,
  two_side: 2,
  three_split: 3,
  three_split_rev: 3,
  four_quad: 4,
};

export function parsePhotoGridLayout(raw: unknown): PhotoGridLayout {
  if (
    raw === "two_stack" ||
    raw === "two_side" ||
    raw === "three_split" ||
    raw === "three_split_rev" ||
    raw === "four_quad"
  ) {
    return raw;
  }
  return "four_quad";
}

/** Prefer a picker-visible layout when restoring editor UI state. */
export function parsePhotoGridPickerLayout(raw: unknown): PhotoGridLayout {
  const parsed = parsePhotoGridLayout(raw);
  if (parsed === "three_split" || parsed === "three_split_rev" || parsed === "four_quad") return parsed;
  return "four_quad";
}

export function photoGridSlotCount(layout: PhotoGridLayout): number {
  return SLOT_COUNT[layout] ?? 4;
}

export function isThreeSplitGridLayout(
  layout: unknown,
): layout is "three_split" | "three_split_rev" {
  return layout === "three_split" || layout === "three_split_rev";
}

/** Locked crop specs for 3-up photo grid: tall slot 1:2, small slots 1:1. */
export function threeSplitSlotCropSpec(slotIndex: number): {
  ratio: number;
  exportW: number;
  exportH: number;
} {
  if (slotIndex === 0) {
    return { ratio: 1 / 2, exportW: 1080, exportH: 2160 };
  }
  return { ratio: 1, exportW: 1080, exportH: 1080 };
}
