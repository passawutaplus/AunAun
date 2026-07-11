import type { Category, ProjectCategory } from "@/data/projectTypes";
import {
  categories,
  DEFAULT_PROJECT_CATEGORY,
  normalizeProjectCategory,
} from "@/data/projectTypes";
import { resolveToolIconSlug } from "@/lib/toolIcons";

export const COMMUNITY_CATEGORIES = categories.filter((c) => c !== "Explore") as ProjectCategory[];

export const DEFAULT_COMMUNITY_TITLE = "โพสต์จาก Designer Area";

const TOOL_SLUG_CATEGORY: Record<string, ProjectCategory> = {
  figma: "UI/UX",
  sketch: "UI/UX",
  framer: "UI/UX",
  penpot: "UI/UX",
  invision: "UI/UX",
  zeplin: "UI/UX",
  xd: "UI/UX",

  webflow: "Web / App",
  react: "Web / App",
  nextdotjs: "Web / App",
  vue: "Web / App",
  angular: "Web / App",
  svelte: "Web / App",
  tailwindcss: "Web / App",
  html5: "Web / App",
  css3: "Web / App",

  premierepro: "Video / Film",
  "davinci-resolve": "Video / Film",
  "final-cut-pro": "Video / Film",
  capcut: "Video / Film",
  runway: "Video / Film",

  "after-effects": "Motion / Animation",
  animate: "Motion / Animation",

  lightroom: "Photography",
  "affinity-photo": "Photography",

  procreate: "Illustration / Art",
  illustrator: "Illustration / Art",
  "affinity-designer": "Illustration / Art",
  coreldraw: "Illustration / Art",

  blender: "3D / CG / Game",
  "cinema-4d": "3D / CG / Game",
  zbrush: "3D / CG / Game",
  "autodesk-maya": "3D / CG / Game",
  autodesk: "3D / CG / Game",
  rhinoceros: "3D / CG / Game",
  houdini: "3D / CG / Game",
  spline: "3D / CG / Game",
  unity: "3D / CG / Game",
  "unreal-engine": "3D / CG / Game",
  "substance-3d-painter": "3D / CG / Game",

  audition: "Music / Audio",
  "logic-pro": "Music / Audio",
  "ableton-live": "Music / Audio",
  "fl-studio": "Music / Audio",
  "pro-tools": "Music / Audio",
  garageband: "Music / Audio",

  photoshop: "Graphic / Branding",
  indesign: "Graphic / Branding",
  canva: "Graphic / Branding",

  midjourney: "AI / Experimental",
  "stability-ai": "AI / Experimental",
  openai: "AI / Experimental",
  anthropic: "AI / Experimental",
  "firefly-adobe": "AI / Experimental",
};

const KEYWORD_SCORES: { pattern: RegExp; category: ProjectCategory; weight: number }[] = [
  { pattern: /(ui|ux|figma|wireframe|prototype|design system)/i, category: "UI/UX", weight: 2 },
  { pattern: /(เว็บ|หน้าเว็บ|แอป|website|frontend|webflow)/i, category: "Web / App", weight: 2 },
  { pattern: /(ตัดต่อ|วิดีโอ|film|cinematic|premiere|reel)/i, category: "Video / Film", weight: 2 },
  { pattern: /(motion|animation|mograph|after effects|animate)/i, category: "Motion / Animation", weight: 2 },
  { pattern: /(ภาพถ่าย|photo|lightroom|retouch|สตูดิโอ)/i, category: "Photography", weight: 2 },
  { pattern: /(illustration|วาด|procreate|vector|ไอคอน|มาสคอต|ศิลปะ)/i, category: "Illustration / Art", weight: 2 },
  { pattern: /(3d|blender|game|unity|unreal|sculpt|render|cgi)/i, category: "3D / CG / Game", weight: 2 },
  { pattern: /(art\s*toy|arttoy|figurine|figure|soft\s*vinyl|sofubi|resin|garage\s*kit|model\s*kit|อาร์ตทอย|ฟิกเกอร์)/i, category: "Art Toy / Model", weight: 2.5 },
  { pattern: /(สถาปัตย|interior|ตกแต่งภายใน|floor plan)/i, category: "Architecture / Interior", weight: 2 },
  { pattern: /(product design|packaging|industrial|ผลิตภัณฑ์)/i, category: "Product / Industrial", weight: 2 },
  { pattern: /(fashion|textile|แฟชั่น|ลายผ้า)/i, category: "Fashion / Textile", weight: 2 },
  { pattern: /(craft|handmade|งานมือ|หัตถกรรม)/i, category: "Craft / Handmade", weight: 2 },
  { pattern: /(โฆษณา|campaign|advertising|key visual)/i, category: "Advertising / Campaign", weight: 2 },
  { pattern: /(content|social|caption|marketing|instagram|tiktok)/i, category: "Content / Social", weight: 2 },
  { pattern: /(เขียน|writing|story|script|บทความ|blog|copy)/i, category: "Writing / Storytelling", weight: 2 },
  { pattern: /(เพลง|music|beat|audio|mix|master|podcast)/i, category: "Music / Audio", weight: 2 },
  { pattern: /(ai|generative|midjourney|stable diffusion|experimental)/i, category: "AI / Experimental", weight: 2 },
  { pattern: /(โลโก้|logo|poster|banner|branding|layout|print|สิ่งพิมพ์)/i, category: "Graphic / Branding", weight: 2 },
];

export type ClassifyInput = {
  body: string;
  tags?: string[];
  tools?: string[];
  hasVideo?: boolean;
  hasImages?: boolean;
  /** Published project categories from @mentions — strong signal. */
  mentionedProjectCategories?: string[];
};

/** First line or first 120 chars of caption for DB title / feed headline. */
export function deriveTitle(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return DEFAULT_COMMUNITY_TITLE;
  const firstLine = trimmed.split(/\r?\n/).find((l) => l.trim())?.trim() ?? trimmed;
  const title = firstLine.length > 120 ? firstLine.slice(0, 120).trim() : firstLine;
  return title.length >= 3 ? title : DEFAULT_COMMUNITY_TITLE;
}

export function titlesMatch(title: string, body: string): boolean {
  const a = title.trim();
  const b = deriveTitle(body);
  return a === b || a === DEFAULT_COMMUNITY_TITLE;
}

export function resolveComposerTitle(title: string, body: string): string {
  const t = title.trim();
  if (t.length >= 3) return t.length > 120 ? t.slice(0, 120).trim() : t;
  return deriveTitle(body);
}

/** Feed/card headline — body excerpt when title is auto-derived from caption. */
export function postHeadline(title: string, body: string): string {
  if (!titlesMatch(title, body)) return title.trim() || DEFAULT_COMMUNITY_TITLE;
  const trimmed = body.trim();
  if (!trimmed) return title.trim() || DEFAULT_COMMUNITY_TITLE;
  const firstLine = trimmed.split(/\r?\n/).find((l) => l.trim())?.trim() ?? trimmed;
  return firstLine.length > 120 ? `${firstLine.slice(0, 120).trim()}…` : firstLine;
}

export function classifyCategory(input: ClassifyInput): ProjectCategory {
  const scores = new Map<ProjectCategory, number>();
  const bump = (cat: ProjectCategory, n = 1) => {
    scores.set(cat, (scores.get(cat) ?? 0) + n);
  };

  for (const tool of input.tools ?? []) {
    const slug = resolveToolIconSlug(tool);
    if (slug && TOOL_SLUG_CATEGORY[slug]) bump(TOOL_SLUG_CATEGORY[slug], 3);
  }

  for (const raw of input.mentionedProjectCategories ?? []) {
    const cat = normalizeProjectCategory(raw);
    if (cat) bump(cat, 4);
  }

  const text = [input.body, ...(input.tags ?? [])].join(" ");
  for (const { pattern, category, weight } of KEYWORD_SCORES) {
    if (pattern.test(text)) bump(category, weight);
  }

  if (input.hasVideo) bump("Video / Film", 2);
  if (input.hasImages && !input.hasVideo) bump("Photography", 1);

  let best: ProjectCategory = DEFAULT_PROJECT_CATEGORY;
  let bestScore = -1;
  for (const cat of COMMUNITY_CATEGORIES) {
    const s = scores.get(cat) ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  return best;
}

/** Composer / publish — explicit override wins, else auto-classify. */
export function resolvePostCategory(
  input: ClassifyInput & { categoryOverride?: ProjectCategory | null },
): ProjectCategory {
  if (input.categoryOverride) return input.categoryOverride;
  return classifyCategory(input);
}

/** Resolve stored category (legacy or current) for display/filter. */
export function resolveCommunityCategory(value: string | null | undefined): ProjectCategory {
  return normalizeProjectCategory(value) ?? DEFAULT_PROJECT_CATEGORY;
}
