/**
 * CATEGORY — the one list for the whole site (mock: Main, Upload, Login, MyStudio).
 * The strings are both the stored value (`projects.sc_category`, `profiles.sc_categories`) and the label.
 */
export const SC_CATEGORIES = [
  "Illustration", "Graphic", "Branding", "Typography", "Painting", "Drawing", "Printmaking", "Risograph",
  "Collage", "Zine", "Photography", "Motion", "3D", "Sculpture", "Ceramics", "Textile", "Fashion", "Product",
  "Character", "UX/UI", "Mixed Media", "Other",
] as const;

export type ScCategory = (typeof SC_CATEGORIES)[number];

export function isScCategory(value: string | null | undefined): value is ScCategory {
  return !!value && (SC_CATEGORIES as readonly string[]).includes(value);
}
