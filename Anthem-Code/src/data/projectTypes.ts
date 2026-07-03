/** Types + static lists only — no mock images (safe for type-only imports). */

export const PROJECT_CATEGORIES = [
  "Graphic / Branding",
  "Illustration / Art",
  "Photography",
  "Video / Film",
  "Motion / Animation",
  "UI/UX",
  "Web / App",
  "3D / CG / Game",
  "Architecture / Interior",
  "Product / Industrial",
  "Fashion / Textile",
  "Craft / Handmade",
  "Advertising / Campaign",
  "Content / Social",
  "Writing / Storytelling",
  "Music / Audio",
  "AI / Experimental",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type Category = "Explore" | ProjectCategory;

export const DEFAULT_PROJECT_CATEGORY: ProjectCategory = "Graphic / Branding";

/** Map legacy DB values → current taxonomy (existing projects keep working in filters/UI). */
export const LEGACY_CATEGORY_ALIASES: Record<string, ProjectCategory> = {
  Graphic: "Graphic / Branding",
  Branding: "Graphic / Branding",
  Illustration: "Illustration / Art",
  Photography: "Photography",
  Video: "Video / Film",
  Motion: "Motion / Animation",
  Craft: "Craft / Handmade",
  "Web/UI": "UI/UX",
  Content: "Content / Social",
  "Music/Audio": "Music / Audio",
};

export function normalizeProjectCategory(value: string | null | undefined): ProjectCategory | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if ((PROJECT_CATEGORIES as readonly string[]).includes(v)) return v as ProjectCategory;
  return LEGACY_CATEGORY_ALIASES[v] ?? null;
}

export function categoryMatchesFilter(
  projectCategory: string,
  filter: ProjectCategory | "All",
): boolean {
  if (filter === "All") return true;
  if (projectCategory === filter) return true;
  const normProject = normalizeProjectCategory(projectCategory);
  const normFilter = normalizeProjectCategory(filter) ?? filter;
  if (normProject && normProject === normFilter) return true;
  const legacyKey = Object.entries(LEGACY_CATEGORY_ALIASES).find(([, mapped]) => mapped === filter)?.[0];
  return legacyKey === projectCategory;
}

/** DB values that should match a feed chip (canonical + legacy aliases). */
export function categoryDbFilterValues(filter: ProjectCategory | "All"): string[] {
  if (filter === "All") return [];
  const norm = normalizeProjectCategory(filter) ?? filter;
  const values = new Set<string>([filter, norm]);
  for (const [legacy, mapped] of Object.entries(LEGACY_CATEGORY_ALIASES)) {
    if (mapped === norm) values.add(legacy);
  }
  return Array.from(values);
}

export type SpecialFilter = "Following" | "Newest" | "Collections" | "Top 1";
export type FeedFilter = Category | SpecialFilter;

export type ProjectStatus = "Published" | "Draft" | "Private";
export type HiringStatus = "ที่ต้องตอบ" | "ใหม่" | "ติดต่อแล้ว" | "ปิดแล้ว";

export interface Project {
  id: string;
  title: string;
  image: string;
  gallery?: string[];
  category: Category;
  owner: string;
  ownerId?: string;
  ownerAvatar: string;
  likes: number;
  views: number;
  comments: number;
  bookmarked: boolean;
  status: ProjectStatus;
  publishedDate: string;
  tools?: string[];
  tags?: string[];
  description?: string;
  price?: string;
  allowHire?: boolean;
  allowCollab?: boolean;
  licenseType?: string;
}

export interface HiringRequest {
  id: string;
  clientName: string;
  clientAvatar: string;
  status: HiringStatus;
  referenceProject: string;
  message: string;
  email: string;
  date: string;
}

export const categories: Category[] = ["Explore", ...PROJECT_CATEGORIES];

export const specialFilters: SpecialFilter[] = ["Following", "Newest", "Collections", "Top 1"];
export const feedFilters: FeedFilter[] = [
  "Explore",
  ...specialFilters,
  ...PROJECT_CATEGORIES,
];
