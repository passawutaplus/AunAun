/** Legacy layouts still parse/render for existing projects. */
export type LegacyPhotoGridLayout =
  | "two_stack"
  | "two_side"
  | "three_split"
  | "three_split_rev"
  | "four_quad";

/** Mosaic layouts (moved from Flex Photo Grid). */
export type MosaicPhotoGridLayout =
  | "tower_stack_tower"
  | "two_over_wide"
  | "stack_tower_stack"
  | "wide_over_two"
  | "alt_stack_tower_4"
  | "alt_tower_stack_4";

export type PhotoGridLayout = LegacyPhotoGridLayout | MosaicPhotoGridLayout;

/** Classic layouts shown in the Casual picker (alongside mosaics). */
export type ClassicPickerPhotoGridLayout = "three_split" | "three_split_rev" | "four_quad";

export type PhotoGridCell = {
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
};

export type PhotoGridLayoutMeta = {
  id: PhotoGridLayout;
  label: string;
  description: string;
  slots: number;
  /** Present for mosaic layouts used by CSS-grid renderers. */
  cols?: number;
  rows?: number;
  cells?: PhotoGridCell[];
};

export type MosaicPhotoGridLayoutMeta = PhotoGridLayoutMeta & {
  id: MosaicPhotoGridLayout;
  cols: number;
  rows: number;
  cells: PhotoGridCell[];
};

const CLASSIC_PICKER_LAYOUTS: PhotoGridLayoutMeta[] = [
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

export const MOSAIC_PHOTO_GRID_LAYOUTS: MosaicPhotoGridLayoutMeta[] = [
  {
    id: "tower_stack_tower",
    label: "สูง · สองซ้อน · สูง",
    description: "ซ้ายสูง · กลางสองซ้อน · ขวาสูง",
    slots: 4,
    cols: 3,
    rows: 2,
    cells: [
      { col: 1, row: 1, rowSpan: 2 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 1, rowSpan: 2 },
    ],
  },
  {
    id: "two_over_wide",
    label: "สองบน · กว้างล่าง",
    description: "สองช่องบน · หนึ่งช่องกว้างล่าง",
    slots: 3,
    cols: 2,
    rows: 2,
    cells: [
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 1, row: 2, colSpan: 2 },
    ],
  },
  {
    id: "stack_tower_stack",
    label: "ซ้อน · สูง · ซ้อน",
    description: "ซ้ายสองซ้อน · กลางสูง · ขวาสองซ้อน",
    slots: 5,
    cols: 3,
    rows: 2,
    cells: [
      { col: 1, row: 1 },
      { col: 1, row: 2 },
      { col: 2, row: 1, rowSpan: 2 },
      { col: 3, row: 1 },
      { col: 3, row: 2 },
    ],
  },
  {
    id: "wide_over_two",
    label: "กว้างบน · สองล่าง",
    description: "หนึ่งช่องกว้างบน · สองช่องล่าง",
    slots: 3,
    cols: 2,
    rows: 2,
    cells: [
      { col: 1, row: 1, colSpan: 2 },
      { col: 1, row: 2 },
      { col: 2, row: 2 },
    ],
  },
  {
    id: "alt_stack_tower_4",
    label: "4 คอลัมน์ · ซ้อนสลับ",
    description: "ซ้อน / สูง / ซ้อน / สูง",
    slots: 6,
    cols: 4,
    rows: 2,
    cells: [
      { col: 1, row: 1 },
      { col: 1, row: 2 },
      { col: 2, row: 1, rowSpan: 2 },
      { col: 3, row: 1 },
      { col: 3, row: 2 },
      { col: 4, row: 1, rowSpan: 2 },
    ],
  },
  {
    id: "alt_tower_stack_4",
    label: "4 คอลัมน์ · สูงสลับ",
    description: "สูง / ซ้อน / สูง / ซ้อน",
    slots: 6,
    cols: 4,
    rows: 2,
    cells: [
      { col: 1, row: 1, rowSpan: 2 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 1, rowSpan: 2 },
      { col: 4, row: 1 },
      { col: 4, row: 2 },
    ],
  },
];

/** Layouts shown in the Casual editor picker: classic 3 + mosaic 6. */
export const PHOTO_GRID_LAYOUTS: PhotoGridLayoutMeta[] = [
  ...CLASSIC_PICKER_LAYOUTS,
  ...MOSAIC_PHOTO_GRID_LAYOUTS,
];

const MOSAIC_IDS = new Set<string>(MOSAIC_PHOTO_GRID_LAYOUTS.map((l) => l.id));
const PICKER_IDS = new Set<string>(PHOTO_GRID_LAYOUTS.map((l) => l.id));

const SLOT_COUNT: Record<PhotoGridLayout, number> = {
  two_stack: 2,
  two_side: 2,
  three_split: 3,
  three_split_rev: 3,
  four_quad: 4,
  tower_stack_tower: 4,
  two_over_wide: 3,
  stack_tower_stack: 5,
  wide_over_two: 3,
  alt_stack_tower_4: 6,
  alt_tower_stack_4: 6,
};

export function isMosaicPhotoGridLayout(raw: unknown): raw is MosaicPhotoGridLayout {
  return typeof raw === "string" && MOSAIC_IDS.has(raw);
}

export function isPickerPhotoGridLayout(raw: unknown): raw is PhotoGridLayout {
  return typeof raw === "string" && PICKER_IDS.has(raw);
}

export function getMosaicPhotoGridLayout(id: MosaicPhotoGridLayout): MosaicPhotoGridLayoutMeta {
  return MOSAIC_PHOTO_GRID_LAYOUTS.find((l) => l.id === id) ?? MOSAIC_PHOTO_GRID_LAYOUTS[0];
}

export function parsePhotoGridLayout(raw: unknown): PhotoGridLayout {
  if (
    raw === "two_stack" ||
    raw === "two_side" ||
    raw === "three_split" ||
    raw === "three_split_rev" ||
    raw === "four_quad" ||
    isMosaicPhotoGridLayout(raw)
  ) {
    return raw;
  }
  return "three_split";
}

/** Prefer a picker-visible layout when restoring editor UI state. */
export function parsePhotoGridPickerLayout(raw: unknown): PhotoGridLayout {
  const parsed = parsePhotoGridLayout(raw);
  if (isPickerPhotoGridLayout(parsed)) return parsed;
  return "three_split";
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
