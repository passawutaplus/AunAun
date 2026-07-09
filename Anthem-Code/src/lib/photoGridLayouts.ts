export type PhotoGridLayout = "two_stack" | "two_side" | "three_split" | "four_quad";

export const PHOTO_GRID_LAYOUTS: {
  id: PhotoGridLayout;
  label: string;
  description: string;
  slots: number;
}[] = [
  {
    id: "two_stack",
    label: "2 ภาพ บน-ล่าง",
    description: "เรียงแนวนอน 2 ช่องสี่เหลี่ยมจัตุรัส",
    slots: 2,
  },
  {
    id: "two_side",
    label: "2 ภาพ ซ้าย-ขวา",
    description: "เรียงแนวตั้ง 2 ช่องสี่เหลี่ยมจัตุรัส",
    slots: 2,
  },
  {
    id: "three_split",
    label: "3 ภาพ",
    description: "ซ้ายเต็มสูง · ขวาบน-ล่าง 1:1",
    slots: 3,
  },
  {
    id: "four_quad",
    label: "4 ภาพ ตาราง",
    description: "ตาราง 2×2 สี่เหลี่ยมจัตุรัส",
    slots: 4,
  },
];

export function parsePhotoGridLayout(raw: unknown): PhotoGridLayout {
  if (raw === "two_stack" || raw === "two_side" || raw === "three_split" || raw === "four_quad") {
    return raw;
  }
  return "four_quad";
}

export function photoGridSlotCount(layout: PhotoGridLayout): number {
  return PHOTO_GRID_LAYOUTS.find((l) => l.id === layout)?.slots ?? 4;
}
