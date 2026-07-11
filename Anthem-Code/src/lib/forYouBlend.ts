import { FEED_INTEREST_OPTIONS } from "@/data/feedInterestOptions";
import { categories, type Category } from "@/data/projectTypes";

const BEHAVIOR_WEIGHT = 1;
const INTEREST_WEIGHT = 3;
const SEARCH_WEIGHT = 2;
const TOP_CATS_LIMIT = 4;

export type CategoryWeightsInput = {
  behaviorCategories: string[];
  feedInterests: string[];
  searchCategoryWeights: Record<string, number>;
};

/** Build weighted category frequency map from behavior, survey, and search signals. */
export function buildCategoryWeights(input: CategoryWeightsInput): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const cat of input.behaviorCategories) {
    if (cat) weights[cat] = (weights[cat] ?? 0) + BEHAVIOR_WEIGHT;
  }
  for (const cat of input.feedInterests) {
    if (cat) weights[cat] = (weights[cat] ?? 0) + INTEREST_WEIGHT;
  }
  for (const [cat, w] of Object.entries(input.searchCategoryWeights)) {
    if (cat && w > 0) weights[cat] = (weights[cat] ?? 0) + w * SEARCH_WEIGHT;
  }

  return weights;
}

/** Pick top N categories by weight; tie-break by feed_interests order then name. */
export function pickTopCategories(
  weights: Record<string, number>,
  feedInterests: string[],
  limit = TOP_CATS_LIMIT,
): string[] {
  const interestOrder = new Map(feedInterests.map((c, i) => [c, i]));
  return Object.entries(weights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => {
      const diff = b[1] - a[1];
      if (diff !== 0) return diff;
      const ao = interestOrder.get(a[0]) ?? 999;
      const bo = interestOrder.get(b[0]) ?? 999;
      if (ao !== bo) return ao - bo;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([c]) => c);
}

export function resolveTopCategories(input: CategoryWeightsInput): string[] {
  const weights = buildCategoryWeights(input);
  const top = pickTopCategories(weights, input.feedInterests);
  if (top.length > 0) return top;
  if (input.feedInterests.length > 0) return input.feedInterests.slice(0, TOP_CATS_LIMIT);
  return [];
}

export type BlendableProject = { id: string };

/** AI recs first, then category pool; dedupe; push seen ids to bottom. */
export function blendPersonalizedProjects<T extends BlendableProject>(
  aiRecs: T[],
  catBased: T[],
  seenIds: Set<string>,
): T[] {
  const seenInList = new Set<string>();
  const blended: T[] = [];
  for (const p of [...aiRecs, ...catBased]) {
    if (seenInList.has(p.id)) continue;
    seenInList.add(p.id);
    blended.push(p);
  }
  return blended.sort((a, b) => Number(seenIds.has(a.id)) - Number(seenIds.has(b.id)));
}

/** Map free-text search query to canonical feed categories. */
export function mapSearchQueryToCategories(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const feedCats = categories.filter((c): c is Exclude<Category, "Explore"> => c !== "Explore");
  const matched = new Set<string>();

  for (const cat of feedCats) {
    const catLower = cat.toLowerCase();
    if (q.includes(catLower) || catLower.includes(q)) matched.add(cat);
  }

  const aliasMap: Record<string, string[]> = {
    "Graphic / Branding": ["graphic", "logo", "branding", "brand", "poster", "typography", "print", "identity"],
    "Illustration / Art": ["illustration", "illustrator", "drawing", "character", "art", "vector"],
    Photography: ["photo", "photography", "photographer", "product shot", "portrait"],
    "Video / Film": ["video", "film", "cinematic", "documentary", "premiere", "davinci", "reel"],
    "Motion / Animation": ["motion", "animation", "after effects", "ae", "mograph", "animate"],
    "UI/UX": ["ui", "ux", "figma", "interface", "wireframe", "prototype", "design system"],
    "Web / App": ["web", "app", "website", "frontend", "nextjs", "react", "webflow"],
    "3D / CG / Game": ["3d", "cg", "game", "blender", "unity", "unreal", "modeling", "render"],
    "Art Toy / Model": ["art toy", "arttoy", "figurine", "figure", "soft vinyl", "sofubi", "resin", "garage kit", "model kit", "อาร์ตทอย", "ฟิกเกอร์", "โมเดล"],
    "Architecture / Interior": ["architecture", "interior", "spatial", "building", "floor plan"],
    "Product / Industrial": ["product design", "industrial", "packaging", "cad"],
    "Fashion / Textile": ["fashion", "textile", "garment", "pattern", "lookbook"],
    "Craft / Handmade": ["craft", "handmade", "artisan", "ceramic", "woodwork"],
    "Advertising / Campaign": ["advertising", "campaign", "ads", "commercial", "key visual"],
    "Content / Social": ["content", "social", "marketing", "creative", "instagram", "tiktok"],
    "Writing / Storytelling": ["writing", "story", "copy", "script", "narrative", "blog"],
    "Music / Audio": ["music", "audio", "sound", "podcast", "mix", "master"],
    "AI / Experimental": ["ai", "generative", "midjourney", "stable diffusion", "experimental"],
    // legacy keys still map searches to new categories
    Graphic: ["graphic"],
    Illustration: ["illustration"],
    Video: ["video"],
    Craft: ["craft"],
    "Web/UI": ["web/ui"],
    Content: ["content"],
    "Music/Audio": ["music/audio"],
  };

  for (const [cat, tokens] of Object.entries(aliasMap)) {
    if (tokens.some((t) => q.includes(t))) matched.add(cat);
  }

  for (const opt of FEED_INTEREST_OPTIONS) {
    if (opt.label.toLowerCase().includes(q) || opt.subtitle.toLowerCase().includes(q)) {
      matched.add(opt.id);
    }
  }

  return Array.from(matched);
}

/** Aggregate search history into per-category weights (recent queries weigh more). */
export function aggregateSearchCategoryWeights(queries: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  queries.forEach((query, idx) => {
    const recency = queries.length - idx;
    for (const cat of mapSearchQueryToCategories(query)) {
      out[cat] = (out[cat] ?? 0) + recency;
    }
  });
  return out;
}

export { TOP_CATS_LIMIT };
