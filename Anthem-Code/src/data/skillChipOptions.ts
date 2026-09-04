/** Suggested craft skills for About Me / onboarding — not design software. Users can still add custom tags. */

export const SKILL_CHIP_CATALOG = [
  { en: "Package Design", th: "ออกแบบแพ็กเกจ" },
  { en: "Product Design", th: "ออกแบบโปรดักต์" },
  { en: "Branding", th: "ทำแบรนดิ้ง" },
  { en: "Logo Design", th: "ออกแบบโลโก้" },
  { en: "Print Design", th: "ออกแบบสิ่งพิมพ์" },
  { en: "Packaging Design", th: "ออกแบบบรรจุภัณฑ์" },
  { en: "UI Design", th: "ออกแบบ UI" },
  { en: "Social Media Design", th: "ออกแบบโซเชียล" },
  { en: "Illustration", th: "วาดภาพประกอบ" },
  { en: "Motion Graphics", th: "โมชันกราฟิก" },
  { en: "Product Photography", th: "ถ่ายภาพสินค้า" },
  { en: "Typography Design", th: "ออกแบบตัวอักษร" },
] as const;

export const SKILL_CHIP_SUGGESTIONS_EN = SKILL_CHIP_CATALOG.map((item) => item.en);

/** Thai labels — used by onboarding and other Thai-first surfaces. */
export const SKILL_CHIP_SUGGESTIONS = SKILL_CHIP_CATALOG.map((item) => item.th);

export type SkillChipSuggestion = (typeof SKILL_CHIP_SUGGESTIONS)[number];

function skillKey(raw: string): string {
  return raw.trim().toLowerCase();
}

const SKILL_ALIAS_TO_EN = (() => {
  const map = new Map<string, string>();
  for (const item of SKILL_CHIP_CATALOG) {
    map.set(skillKey(item.en), item.en);
    map.set(skillKey(item.th), item.en);
  }
  return map;
})();

/** Map a known Thai/English catalog skill onto the English label. Custom tags stay as typed. */
export function canonicalizeSkillChip(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return SKILL_ALIAS_TO_EN.get(skillKey(t)) ?? t;
}

export function isCatalogSkillSelected(selected: string[], candidate: string): boolean {
  const want = skillKey(canonicalizeSkillChip(candidate));
  return selected.some((item) => skillKey(canonicalizeSkillChip(item)) === want);
}
