import type { ProjectCategory } from "@/data/projectTypes";
import { DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";

/** Top-level chips on the projects feed bar — broad groups only. */
export type CategoryParentId =
  | "graphic"
  | "illustration"
  | "uiux"
  | "motion"
  | "photography"
  | "three_d"
  | "architecture"
  | "industrial"
  | "fashion"
  | "other";

/**
 * Subcategory under a parent — single topic label (no combined "A / B").
 * Matches DB `category` and/or project `tags`.
 */
export type CategorySub = {
  id: string;
  label: string;
  /** Existing DB project categories this sub maps to. */
  categories?: ProjectCategory[];
  /** Match against project.tags (case-insensitive). */
  aliases?: string[];
};

export type CategoryParent = {
  id: CategoryParentId;
  /** Broad English label for feed chips + filter sheet. */
  label: string;
  /** All DB categories under this parent (used when no sub is selected). */
  leaves: ProjectCategory[];
  /** Detail chips — design/art topics only, not marketplace services. */
  subs: CategorySub[];
};

/** Stored in project.tags so we can round-trip subcategory selection. */
export const CATEGORY_SUB_TAG_PREFIX = "catsub:";

export function categorySubTag(subId: string): string {
  return `${CATEGORY_SUB_TAG_PREFIX}${subId}`;
}

export function parseCategorySubId(tags: string[] | null | undefined): string | null {
  for (const t of tags ?? []) {
    const v = t.trim();
    if (v.toLowerCase().startsWith(CATEGORY_SUB_TAG_PREFIX)) {
      return v.slice(CATEGORY_SUB_TAG_PREFIX.length);
    }
  }
  return null;
}

export function stripCategorySubTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((t) => !t.trim().toLowerCase().startsWith(CATEGORY_SUB_TAG_PREFIX));
}

export function mergeCategorySubTag(tags: string[] | null | undefined, subId: string | null | undefined): string[] {
  const base = stripCategorySubTags(tags);
  if (!subId) return base;
  return [...base, categorySubTag(subId)];
}

/** @deprecated use CategorySub */
export type StyleSubcategory = CategorySub;

export const CATEGORY_PARENTS: CategoryParent[] = [
  {
    id: "graphic",
    label: "Graphic",
    leaves: ["Graphic / Branding", "Advertising / Campaign"],
    subs: [
      { id: "branding", label: "Branding", categories: ["Graphic / Branding"], aliases: ["branding", "brand system", "visual identity"] },
      { id: "logo", label: "Logo", aliases: ["logo", "โลโก้"] },
      { id: "identity", label: "Identity", aliases: ["identity", "brand identity"] },
      { id: "packaging", label: "Packaging", aliases: ["packaging", "package", "แพ็กเกจ"] },
      { id: "editorial", label: "Editorial", aliases: ["editorial", "print", "สิ่งพิมพ์"] },
      { id: "magazine", label: "Magazine", aliases: ["magazine", "นิตยสาร"] },
      { id: "book-design", label: "Book Design", aliases: ["book design", "book cover"] },
      { id: "poster", label: "Poster", aliases: ["poster", "โปสเตอร์"] },
      { id: "key-visual", label: "Key Visual", aliases: ["key visual", "kv"] },
      { id: "billboard", label: "Billboard", aliases: ["billboard", "ooh"] },
      { id: "lettering", label: "Lettering", aliases: ["lettering"] },
      { id: "typography", label: "Typography", aliases: ["typography", "type", "ฟอนต์"] },
      { id: "infographic", label: "Infographic", aliases: ["infographic"] },
      { id: "icon-design", label: "Icon Design", aliases: ["icon", "icon design", "icons"] },
      { id: "advertising", label: "Advertising", categories: ["Advertising / Campaign"], aliases: ["advertising", "campaign", "โฆษณา"] },
      { id: "social-graphic", label: "Social Graphic", aliases: ["social graphic", "social media design"] },
      { id: "presentation", label: "Presentation", aliases: ["presentation", "pitch deck", "slide"] },
      { id: "stationery", label: "Stationery", aliases: ["stationery", "business card"] },
      { id: "wayfinding", label: "Wayfinding", aliases: ["wayfinding", "signage"] },
    ],
  },
  {
    id: "illustration",
    label: "Illustration",
    leaves: ["Illustration / Art"],
    subs: [
      { id: "illustration", label: "Illustration", categories: ["Illustration / Art"], aliases: ["illustration"] },
      { id: "character", label: "Character", aliases: ["character", "character design", "คาแรกเตอร์"] },
      { id: "concept-art", label: "Concept Art", aliases: ["concept", "concept art"] },
      { id: "comics", label: "Comics", aliases: ["comics", "comic"] },
      { id: "manga", label: "Manga", aliases: ["manga", "มังงะ"] },
      { id: "webtoon", label: "Webtoon", aliases: ["webtoon"] },
      { id: "children-book", label: "Children Book", aliases: ["children book", "kids illustration"] },
      { id: "cover-art", label: "Cover Art", aliases: ["cover art", "album cover"] },
      { id: "spot-illustration", label: "Spot Illustration", aliases: ["spot illustration"] },
      { id: "digital-painting", label: "Digital Painting", aliases: ["digital painting"] },
      { id: "traditional-art", label: "Traditional Art", aliases: ["traditional art", "drawing"] },
      { id: "fine-art", label: "Fine Art", aliases: ["fine art", "painting", "จิตรกรรม"] },
      { id: "fan-art", label: "Fan Art", aliases: ["fan art", "fanart"] },
      { id: "storyboard", label: "Storyboard", aliases: ["storyboard"] },
      { id: "surface-pattern", label: "Surface Pattern", aliases: ["pattern", "surface pattern"] },
    ],
  },
  {
    id: "uiux",
    label: "UX/UI",
    leaves: ["UI/UX", "Web / App"],
    subs: [
      { id: "ui", label: "UI", categories: ["UI/UX"], aliases: ["ui", "user interface"] },
      { id: "ux", label: "UX", aliases: ["ux", "user experience"] },
      { id: "website", label: "Website", categories: ["Web / App"], aliases: ["website", "web ui"] },
      { id: "landing-page", label: "Landing Page", aliases: ["landing", "landing page"] },
      { id: "app", label: "App", aliases: ["app", "app ui"] },
      { id: "mobile", label: "Mobile", aliases: ["mobile", "ios", "android"] },
      { id: "desktop-app", label: "Desktop App", aliases: ["desktop app", "desktop"] },
      { id: "dashboard", label: "Dashboard", aliases: ["dashboard", "admin"] },
      { id: "saas", label: "SaaS", aliases: ["saas"] },
      { id: "design-system", label: "Design System", aliases: ["design system", "component library"] },
      { id: "wireframe", label: "Wireframe", aliases: ["wireframe"] },
      { id: "prototype", label: "Prototype", aliases: ["prototype"] },
      { id: "user-research", label: "User Research", aliases: ["user research", "ux research"] },
      { id: "interaction", label: "Interaction", aliases: ["interaction", "micro interaction"] },
      { id: "accessibility", label: "Accessibility", aliases: ["accessibility", "a11y"] },
    ],
  },
  {
    id: "motion",
    label: "Motion",
    leaves: ["Motion / Animation", "Video / Film"],
    subs: [
      { id: "motion-graphics", label: "Motion Graphics", categories: ["Motion / Animation"], aliases: ["motion", "motion graphics"] },
      { id: "2d-animation", label: "2D Animation", aliases: ["2d animation", "animation", "แอนิเมชัน"] },
      { id: "3d-animation", label: "3D Animation", aliases: ["3d animation"] },
      { id: "explainer", label: "Explainer", aliases: ["explainer"] },
      { id: "title-sequence", label: "Title Sequence", aliases: ["title sequence", "opening title"] },
      { id: "video", label: "Video", categories: ["Video / Film"], aliases: ["video"] },
      { id: "film", label: "Film", aliases: ["film", "cinema", "short film"] },
      { id: "documentary", label: "Documentary", aliases: ["documentary"] },
      { id: "commercial", label: "Commercial", aliases: ["tvc", "commercial", "โฆษณา"] },
      { id: "music-video", label: "Music Video", aliases: ["music video", "mv"] },
      { id: "vfx", label: "VFX", aliases: ["vfx", "visual effects"] },
      { id: "stop-motion", label: "Stop Motion", aliases: ["stop motion"] },
      { id: "gif-loop", label: "GIF Loop", aliases: ["gif", "loop"] },
    ],
  },
  {
    id: "photography",
    label: "Photography",
    leaves: ["Photography"],
    subs: [
      { id: "photography", label: "Photography", categories: ["Photography"] },
      { id: "product-photo", label: "Product", aliases: ["product photography", "product", "สินค้า"] },
      { id: "portrait", label: "Portrait", aliases: ["portrait"] },
      { id: "fashion-photo", label: "Fashion Photo", aliases: ["fashion photography"] },
      { id: "lifestyle", label: "Lifestyle", aliases: ["lifestyle", "ไลฟ์สไตล์"] },
      { id: "editorial-photo", label: "Editorial Photo", aliases: ["editorial photography"] },
      { id: "architecture-photo", label: "Architecture Photo", aliases: ["architecture photography"] },
      { id: "food-photo", label: "Food", aliases: ["food photography", "food"] },
      { id: "event-photo", label: "Event", aliases: ["event photography", "event"] },
      { id: "documentary-photo", label: "Documentary Photo", aliases: ["documentary photography"] },
      { id: "street-photo", label: "Street", aliases: ["street photography", "street"] },
      { id: "landscape-photo", label: "Landscape", aliases: ["landscape photography"] },
      { id: "still-life", label: "Still Life", aliases: ["still life"] },
    ],
  },
  {
    id: "three_d",
    label: "3D",
    leaves: ["3D / CG / Game", "Art Toy / Model"],
    subs: [
      { id: "cg", label: "CG", categories: ["3D / CG / Game"], aliases: ["cg", "3d", "cgi"] },
      { id: "modeling", label: "Modeling", aliases: ["modeling", "3d modeling"] },
      { id: "character-3d", label: "Character 3D", aliases: ["3d character", "character 3d"] },
      { id: "environment", label: "Environment", aliases: ["environment", "scene"] },
      { id: "product-viz", label: "Product Viz", aliases: ["product viz", "product visualization"] },
      { id: "art-toy", label: "Art Toy", categories: ["Art Toy / Model"], aliases: ["art toy", "figure", "อาร์ตทอย"] },
      { id: "game", label: "Game", aliases: ["game", "game asset"] },
      { id: "sculpting", label: "Sculpting", aliases: ["sculpting", "digital sculpt"] },
      { id: "texturing", label: "Texturing", aliases: ["texturing", "lookdev"] },
      { id: "rendering", label: "Rendering", aliases: ["rendering", "render"] },
      { id: "hard-surface", label: "Hard Surface", aliases: ["hard surface"] },
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    leaves: ["Architecture / Interior"],
    subs: [
      { id: "architecture", label: "Architecture", categories: ["Architecture / Interior"], aliases: ["architecture"] },
      { id: "interior", label: "Interior", aliases: ["interior", "interior design"] },
      { id: "landscape", label: "Landscape", aliases: ["landscape architecture"] },
      { id: "urban-design", label: "Urban Design", aliases: ["urban design", "urban"] },
      { id: "visualization", label: "Visualization", aliases: ["archviz", "architectural visualization"] },
      { id: "floor-plan", label: "Floor Plan", aliases: ["floor plan"] },
      { id: "furniture-space", label: "Furniture Space", aliases: ["furniture layout"] },
      { id: "renovation", label: "Renovation", aliases: ["renovation"] },
    ],
  },
  {
    id: "industrial",
    label: "Industrial",
    leaves: ["Product / Industrial"],
    subs: [
      { id: "industrial", label: "Industrial", categories: ["Product / Industrial"], aliases: ["industrial"] },
      { id: "product-design", label: "Product Design", aliases: ["product design", "product"] },
      { id: "furniture", label: "Furniture", aliases: ["furniture design", "furniture"] },
      { id: "consumer-electronics", label: "Consumer Electronics", aliases: ["electronics", "gadget"] },
      { id: "transportation", label: "Transportation", aliases: ["transportation design", "automotive"] },
      { id: "packaging-industrial", label: "Industrial Packaging", aliases: ["industrial packaging"] },
      { id: "prototype-physical", label: "Physical Prototype", aliases: ["physical prototype", "prototype model"] },
      { id: "ergonomics", label: "Ergonomics", aliases: ["ergonomics"] },
    ],
  },
  {
    id: "fashion",
    label: "Fashion",
    leaves: ["Fashion / Textile", "Craft / Handmade"],
    subs: [
      { id: "fashion-design", label: "Fashion Design", categories: ["Fashion / Textile"], aliases: ["fashion"] },
      { id: "textile", label: "Textile", aliases: ["textile", "fabric"] },
      { id: "pattern-making", label: "Pattern Making", aliases: ["pattern making", "pattern"] },
      { id: "couture", label: "Couture", aliases: ["couture"] },
      { id: "streetwear", label: "Streetwear", aliases: ["streetwear"] },
      { id: "accessories", label: "Accessories", aliases: ["accessories"] },
      { id: "jewelry", label: "Jewelry", aliases: ["jewelry", "jewellery"] },
      { id: "footwear", label: "Footwear", aliases: ["footwear", "shoes"] },
      { id: "craft", label: "Craft", categories: ["Craft / Handmade"], aliases: ["craft"] },
      { id: "handmade", label: "Handmade", aliases: ["handmade"] },
      { id: "ceramics", label: "Ceramics", aliases: ["ceramics", "pottery"] },
    ],
  },
  {
    id: "other",
    label: "Other",
    leaves: ["Content / Social", "Writing / Storytelling", "Music / Audio", "AI / Experimental"],
    subs: [
      { id: "content", label: "Content", categories: ["Content / Social"], aliases: ["content"] },
      { id: "social-media", label: "Social Media", aliases: ["social", "social media"] },
      { id: "writing", label: "Writing", categories: ["Writing / Storytelling"], aliases: ["writing"] },
      { id: "copywriting", label: "Copywriting", aliases: ["copywriting", "copy"] },
      { id: "storytelling", label: "Storytelling", aliases: ["storytelling"] },
      { id: "music", label: "Music", categories: ["Music / Audio"], aliases: ["music"] },
      { id: "audio", label: "Audio", aliases: ["audio"] },
      { id: "sound-design", label: "Sound Design", aliases: ["sound design", "sound"] },
      { id: "podcast", label: "Podcast", aliases: ["podcast"] },
      { id: "ai", label: "AI", categories: ["AI / Experimental"], aliases: ["ai"] },
      { id: "experimental", label: "Experimental", aliases: ["experimental"] },
      { id: "generative", label: "Generative", aliases: ["generative"] },
    ],
  },
];

export const CATEGORY_PARENT_BY_ID: Record<CategoryParentId, CategoryParent> = Object.fromEntries(
  CATEGORY_PARENTS.map((p) => [p.id, p]),
) as Record<CategoryParentId, CategoryParent>;

export function getCategoryParent(id: string | null | undefined): CategoryParent | null {
  if (!id) return null;
  return CATEGORY_PARENT_BY_ID[id as CategoryParentId] ?? null;
}

export function parentIdForProjectCategory(category: string | null | undefined): CategoryParentId | null {
  const norm = normalizeProjectCategory(category) ?? category?.trim();
  if (!norm) return null;
  for (const parent of CATEGORY_PARENTS) {
    if (parent.leaves.includes(norm as ProjectCategory)) return parent.id;
  }
  return null;
}

export function getCategorySub(parent: CategoryParent | null | undefined, subId: string) {
  return parentSubsWithOther(parent).find((s) => s.id === subId) ?? null;
}

/** Subs for UI — always ends with Other. */
export function parentSubsWithOther(parent: CategoryParent | null | undefined): CategorySub[] {
  if (!parent) return [];
  const otherId = `${parent.id}-other`;
  const base = parent.subs.filter((s) => s.id !== otherId && s.label.toLowerCase() !== "other");
  return [
    ...base,
    {
      id: otherId,
      label: "Other",
      categories: parent.leaves[0] ? [parent.leaves[0]] : undefined,
      aliases: ["other"],
    },
  ];
}

export function findSubAcrossParents(subId: string | null | undefined): {
  parent: CategoryParent;
  sub: CategorySub;
} | null {
  if (!subId) return null;
  for (const parent of CATEGORY_PARENTS) {
    const sub = parentSubsWithOther(parent).find((s) => s.id === subId);
    if (sub) return { parent, sub };
  }
  return null;
}

/** Resolve DB `projects.category` from parent (+ optional sub). */
export function resolveDbCategory(
  parentId: CategoryParentId | null | undefined,
  subId?: string | null,
): ProjectCategory {
  const parent = parentId ? getCategoryParent(parentId) : null;
  if (!parent) return DEFAULT_PROJECT_CATEGORY;
  if (subId) {
    const sub = getCategorySub(parent, subId);
    if (sub?.categories?.[0]) return sub.categories[0];
  }
  return parent.leaves[0] ?? DEFAULT_PROJECT_CATEGORY;
}

/** "Graphic > Logo" or just "Graphic" when no sub. */
export function formatCategoryBreadcrumb(
  category: string | null | undefined,
  tags?: string[] | null,
): string {
  const subId = parseCategorySubId(tags);
  const found = findSubAcrossParents(subId);
  if (found) return `${found.parent.label} > ${found.sub.label}`;

  const parentId = parentIdForProjectCategory(category);
  const parent = parentId ? getCategoryParent(parentId) : null;
  if (parent) return parent.label;

  const norm = normalizeProjectCategory(category);
  return norm ?? category?.trim() ?? "Uncategorized";
}

/** Infer editor selection from saved project fields. */
export function inferTaxonomySelection(
  category: string | null | undefined,
  tags?: string[] | null,
): { parentId: CategoryParentId | null; subId: string | null } {
  const subId = parseCategorySubId(tags);
  if (subId) {
    const found = findSubAcrossParents(subId);
    if (found) return { parentId: found.parent.id, subId: found.sub.id };
  }
  return { parentId: parentIdForProjectCategory(category), subId: null };
}

/** True if project matches any selected subcategory (category and/or tags). */
export function projectMatchesSubs(
  projectCategory: string,
  tags: string[] | null | undefined,
  subIds: string[],
  parent?: CategoryParent | null,
): boolean {
  if (!subIds.length) return true;
  const hay = (tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const norm = normalizeProjectCategory(projectCategory) ?? projectCategory;
  const pool = parent
    ? parentSubsWithOther(parent)
    : CATEGORY_PARENTS.flatMap((p) => parentSubsWithOther(p));
  const storedSub = parseCategorySubId(tags);

  return subIds.some((id) => {
    if (storedSub === id) return true;
    if (hay.includes(categorySubTag(id).toLowerCase())) return true;
    const sub = pool.find((s) => s.id === id);
    if (!sub) return hay.includes(id.toLowerCase());
    const catHit = (sub.categories ?? []).some(
      (c) => c === projectCategory || c === norm || normalizeProjectCategory(projectCategory) === c,
    );
    const tagHit = (sub.aliases ?? []).some((alias) =>
      hay.some((t) => t === alias.toLowerCase() || t.includes(alias.toLowerCase())),
    );
    if ((sub.categories?.length ?? 0) > 0 && catHit) return true;
    if ((sub.aliases?.length ?? 0) > 0 && tagHit) return true;
    return false;
  });
}

/** @deprecated use projectMatchesSubs */
export function projectMatchesStyleTags(
  tags: string[] | null | undefined,
  styleIds: string[],
  parent?: CategoryParent | null,
): boolean {
  if (!styleIds.length) return true;
  const hay = (tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!hay.length) return false;
  const styles = parent?.subs ?? CATEGORY_PARENTS.flatMap((p) => p.subs);
  return styleIds.some((id) => {
    const style = styles.find((s) => s.id === id);
    if (!style) return hay.includes(id.toLowerCase());
    return (style.aliases ?? []).some((alias) => hay.some((t) => t === alias || t.includes(alias)));
  });
}
