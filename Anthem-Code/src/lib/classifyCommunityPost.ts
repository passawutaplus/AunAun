import type { Category } from "@/data/projectTypes";
import { categories } from "@/data/projectTypes";
import { resolveToolIconSlug } from "@/lib/toolIcons";

export const COMMUNITY_CATEGORIES = categories.filter((c) => c !== "Explore") as Exclude<
  Category,
  "Explore"
>[];

export const DEFAULT_COMMUNITY_TITLE = "โพสต์จาก Designer Area";

const TOOL_SLUG_CATEGORY: Record<string, Exclude<Category, "Explore">> = {
  figma: "Web/UI",
  sketch: "Web/UI",
  framer: "Web/UI",
  penpot: "Web/UI",
  invision: "Web/UI",
  zeplin: "Web/UI",
  xd: "Web/UI",
  webflow: "Web/UI",
  react: "Web/UI",
  nextdotjs: "Web/UI",
  vue: "Web/UI",
  angular: "Web/UI",
  svelte: "Web/UI",
  tailwindcss: "Web/UI",
  html5: "Web/UI",
  css3: "Web/UI",

  premierepro: "Video",
  "after-effects": "Video",
  "davinci-resolve": "Video",
  "final-cut-pro": "Video",
  capcut: "Video",
  runway: "Video",
  animate: "Video",

  lightroom: "Photography",
  "affinity-photo": "Photography",

  procreate: "Illustration",
  illustrator: "Illustration",
  "affinity-designer": "Illustration",
  coreldraw: "Illustration",

  blender: "Craft",
  "cinema-4d": "Craft",
  zbrush: "Craft",
  "autodesk-maya": "Craft",
  autodesk: "Craft",
  rhinoceros: "Craft",
  houdini: "Craft",
  spline: "Craft",
  unity: "Craft",
  "unreal-engine": "Craft",
  "substance-3d-painter": "Craft",

  audition: "Music/Audio",
  "logic-pro": "Music/Audio",
  "ableton-live": "Music/Audio",
  "fl-studio": "Music/Audio",
  "pro-tools": "Music/Audio",
  garageband: "Music/Audio",

  photoshop: "Graphic",
  indesign: "Graphic",
  canva: "Graphic",
  midjourney: "Graphic",
  "stability-ai": "Graphic",
  openai: "Graphic",
  anthropic: "Graphic",
  "firefly-adobe": "Graphic",
};

const KEYWORD_SCORES: { pattern: RegExp; category: Exclude<Category, "Explore">; weight: number }[] = [
  { pattern: /(ui|ux|figma|wireframe|prototype|เว็บ|หน้าเว็บ|แอป)/i, category: "Web/UI", weight: 2 },
  { pattern: /(ตัดต่อ|วิดีโอ|motion|animation|reel|tiktok|capcut|premiere)/i, category: "Video", weight: 2 },
  { pattern: /(ภาพถ่าย|photo|lightroom|retouch|สตูดิโอ)/i, category: "Photography", weight: 2 },
  { pattern: /(illustration|วาด|procreate|vector|ไอคอน|มาสคอต)/i, category: "Illustration", weight: 2 },
  { pattern: /(3d|blender|model|sculpt|render|zbrush)/i, category: "Craft", weight: 2 },
  { pattern: /(เพลง|music|beat|audio|mix|master)/i, category: "Music/Audio", weight: 2 },
  { pattern: /(copy|content|caption|บทความ|เขียน|blog)/i, category: "Content", weight: 2 },
  { pattern: /(โลโก้|logo|poster|banner|branding|layout|print|สิ่งพิมพ์)/i, category: "Graphic", weight: 2 },
];

export type ClassifyInput = {
  body: string;
  tags?: string[];
  tools?: string[];
  hasVideo?: boolean;
  hasImages?: boolean;
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

export function classifyCategory(input: ClassifyInput): Exclude<Category, "Explore"> {
  const scores = new Map<Exclude<Category, "Explore">, number>();
  const bump = (cat: Exclude<Category, "Explore">, n = 1) => {
    scores.set(cat, (scores.get(cat) ?? 0) + n);
  };

  for (const tool of input.tools ?? []) {
    const slug = resolveToolIconSlug(tool);
    if (slug && TOOL_SLUG_CATEGORY[slug]) bump(TOOL_SLUG_CATEGORY[slug], 3);
  }

  const text = [input.body, ...(input.tags ?? [])].join(" ");
  for (const { pattern, category, weight } of KEYWORD_SCORES) {
    if (pattern.test(text)) bump(category, weight);
  }

  if (input.hasVideo) bump("Video", 2);
  if (input.hasImages && !input.hasVideo) bump("Photography", 1);

  let best: Exclude<Category, "Explore"> = "Graphic";
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
