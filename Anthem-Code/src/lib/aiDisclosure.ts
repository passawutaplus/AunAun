export const AI_USE_LEVELS = ["assist", "partial", "full"] as const;
export type AiUseLevel = (typeof AI_USE_LEVELS)[number];

export const AI_USE_LEVEL_META: Record<
  AiUseLevel,
  { shortLabel: string; hint: string; badgeLabel: string }
> = {
  assist: {
    shortLabel: "ช่วยทำ",
    hint: "ใช้ปรับปรุงภาพ หรือขึ้นต้นแบบ",
    badgeLabel: "AI",
  },
  partial: {
    shortLabel: "ส่วนหนึ่ง",
    hint: "ใช้เป็นส่วนหนึ่งในผลงาน",
    badgeLabel: "AI",
  },
  full: {
    shortLabel: "AI 100%",
    hint: "สร้างจาก AI ทั้งชิ้น",
    badgeLabel: "AI",
  },
};

export function isAiUseLevel(value: string | null | undefined): value is AiUseLevel {
  return value === "assist" || value === "partial" || value === "full";
}

/** Map stored `ai_disclosure_note` (+ flag) to a level. Legacy free-text → partial. */
export function parseAiUseLevel(
  note: string | null | undefined,
  assisted = true,
): AiUseLevel | null {
  if (!assisted) return null;
  const v = note?.trim() ?? "";
  if (isAiUseLevel(v)) return v;
  if (v) return "partial";
  return "assist";
}

export function serializeAiUseLevel(assisted: boolean, level: AiUseLevel | null | undefined): string {
  if (!assisted) return "";
  return level && isAiUseLevel(level) ? level : "assist";
}

export function projectAiCardFields(row: {
  ai_assisted?: boolean | null;
  ai_disclosure_note?: string | null;
}) {
  return {
    aiAssisted: row.ai_assisted ?? false,
    aiDisclosureNote: row.ai_disclosure_note ?? "",
  };
}

/** True when the work shows an AI badge or an AI subcategory tag. */
export function projectHasAiTag(project: {
  aiAssisted?: boolean | null;
  ai_assisted?: boolean | null;
  aiDisclosureNote?: string | null;
  ai_disclosure_note?: string | null;
  tags?: string[] | null;
}): boolean {
  if (project.aiAssisted || project.ai_assisted) return true;
  const note = (project.aiDisclosureNote ?? project.ai_disclosure_note ?? "").trim();
  if (isAiUseLevel(note)) return true;
  return (project.tags ?? []).some((raw) => {
    const t = raw.trim().toLowerCase();
    return t === "ai" || t === "catsub:ai" || t.endsWith(":ai");
  });
}
