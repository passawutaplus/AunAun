/** Group chat purpose tag (hire / collab). */

export type GroupTag = "hire" | "collab";

export function normalizeGroupTag(value: string | null | undefined): GroupTag | null {
  if (value === "hire" || value === "collab") return value;
  return null;
}

export function groupTagLabel(tag: GroupTag | null | undefined): string {
  if (tag === "hire") return "กลุ่มจ้างงาน";
  if (tag === "collab") return "กลุ่มคอลแลป";
  return "กลุ่ม";
}

export function groupTagShortLabel(tag: GroupTag | null | undefined): string {
  if (tag === "hire") return "จ้างงาน";
  if (tag === "collab") return "คอลแลป";
  return "กลุ่ม";
}
