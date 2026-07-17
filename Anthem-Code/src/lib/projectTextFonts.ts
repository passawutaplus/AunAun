/**
 * Free Google Fonts (OFL / Apache) commonly used for Thai + Latin UI/portfolio text.
 * `stack` is the CSS font-family value stored in sanitized HTML.
 */
export type ProjectTextFont = {
  id: string;
  label: string;
  /** CSS font-family stack written into span style */
  stack: string;
  /** Google Fonts family name for the stylesheet URL (omit for system stack) */
  googleFamily?: string;
};

export const PROJECT_TEXT_FONTS: ProjectTextFont[] = [
  {
    id: "default",
    label: "ค่าเริ่มต้น",
    stack: "inherit",
  },
  {
    id: "sarabun",
    label: "Sarabun",
    stack: "'Sarabun', sans-serif",
    googleFamily: "Sarabun:wght@300;400;500;600;700",
  },
  {
    id: "noto_sans_thai",
    label: "Noto Sans Thai",
    stack: "'Noto Sans Thai', sans-serif",
    googleFamily: "Noto+Sans+Thai:wght@300;400;500;600;700",
  },
  {
    id: "ibm_plex_thai",
    label: "IBM Plex Sans Thai",
    stack: "'IBM Plex Sans Thai', sans-serif",
    googleFamily: "IBM+Plex+Sans+Thai:wght@300;400;500;600;700",
  },
  {
    id: "anuphan",
    label: "Anuphan",
    stack: "'Anuphan', sans-serif",
    googleFamily: "Anuphan:wght@300;400;500;600;700",
  },
  {
    id: "prompt",
    label: "Prompt",
    stack: "'Prompt', sans-serif",
    googleFamily: "Prompt:wght@300;400;500;600;700",
  },
  {
    id: "kanit",
    label: "Kanit",
    stack: "'Kanit', sans-serif",
    googleFamily: "Kanit:wght@300;400;500;600;700",
  },
  {
    id: "bai_jamjuree",
    label: "Bai Jamjuree",
    stack: "'Bai Jamjuree', sans-serif",
    googleFamily: "Bai+Jamjuree:wght@300;400;500;600;700",
  },
  {
    id: "inter",
    label: "Inter",
    stack: "'Inter', sans-serif",
    googleFamily: "Inter:wght@300;400;500;600;700",
  },
  {
    id: "roboto",
    label: "Roboto",
    stack: "'Roboto', sans-serif",
    googleFamily: "Roboto:wght@300;400;500;700",
  },
  {
    id: "open_sans",
    label: "Open Sans",
    stack: "'Open Sans', sans-serif",
    googleFamily: "Open+Sans:wght@300;400;500;600;700",
  },
  {
    id: "lora",
    label: "Lora",
    stack: "'Lora', serif",
    googleFamily: "Lora:wght@400;500;600;700",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    stack: "'Playfair Display', serif",
    googleFamily: "Playfair+Display:wght@400;500;600;700",
  },
];

const STACK_BY_NORM = new Map<string, string>();
for (const f of PROJECT_TEXT_FONTS) {
  if (f.id === "default") continue;
  STACK_BY_NORM.set(normalizeFontFamilyKey(f.stack), f.stack);
  STACK_BY_NORM.set(normalizeFontFamilyKey(f.label), f.stack);
}

export function normalizeFontFamilyKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/\s*,\s*sans-serif$/i, "")
    .replace(/\s*,\s*serif$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map an arbitrary CSS font-family to a whitelisted stack, or null. */
export function resolveWhitelistedFontStack(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = normalizeFontFamilyKey(raw.split(",")[0] ?? raw);
  if (!key || key === "inherit") return null;
  return STACK_BY_NORM.get(key) ?? null;
}

export function getProjectTextFont(id: string): ProjectTextFont {
  return PROJECT_TEXT_FONTS.find((f) => f.id === id) ?? PROJECT_TEXT_FONTS[0];
}

/** Google Fonts CSS2 URL covering all project text fonts. */
export function projectTextFontsStylesheetHref(): string {
  const families = PROJECT_TEXT_FONTS.map((f) => f.googleFamily).filter(Boolean) as string[];
  const query = families.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

/** Whitelisted font sizes for project text modules (px). */
export type ProjectTextSize = {
  id: string;
  label: string;
  /** CSS font-size value, or empty for default/inherit */
  size: string;
};

export const PROJECT_TEXT_SIZES: ProjectTextSize[] = [
  { id: "default", label: "ขนาด", size: "" },
  { id: "12", label: "12", size: "12px" },
  { id: "14", label: "14", size: "14px" },
  { id: "16", label: "16", size: "16px" },
  { id: "18", label: "18", size: "18px" },
  { id: "20", label: "20", size: "20px" },
  { id: "24", label: "24", size: "24px" },
  { id: "28", label: "28", size: "28px" },
  { id: "32", label: "32", size: "32px" },
  { id: "36", label: "36", size: "36px" },
  { id: "48", label: "48", size: "48px" },
];

const SIZE_SET = new Set(
  PROJECT_TEXT_SIZES.map((s) => s.size).filter(Boolean),
);

/** Map an arbitrary CSS font-size to a whitelisted px value, or null. */
export function resolveWhitelistedFontSize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (SIZE_SET.has(v)) return v;
  // Accept bare numbers as px (e.g. "18" from UI)
  if (/^\d+$/.test(v)) {
    const asPx = `${v}px`;
    return SIZE_SET.has(asPx) ? asPx : null;
  }
  // Convert common pt → nearest whitelist (browser sometimes uses pt)
  const pt = v.match(/^(\d+(?:\.\d+)?)pt$/);
  if (pt) {
    const px = Math.round(Number(pt[1]) * (96 / 72));
    const asPx = `${px}px`;
    return SIZE_SET.has(asPx) ? asPx : null;
  }
  return null;
}
