/** Suggested tools / styles for ความชำนาญ — users can still add custom tags. */
export const SKILL_CHIP_SUGGESTIONS = [
  "Figma",
  "Photoshop",
  "Illustrator",
  "After Effects",
  "Premiere",
  "Blender",
  "Procreate",
  "Cinema 4D",
  "Framer",
  "Webflow",
  "Minimal",
  "3D Render",
  "Hand-drawn",
  "Typography",
  "Brand System",
] as const;

export type SkillChipSuggestion = (typeof SKILL_CHIP_SUGGESTIONS)[number];
