/** URL helpers for package feed discovery (category / tag chips). */

import {
  CATEGORY_PARENTS,
  parentIdForProjectCategory,
  stripCategorySubTags,
} from "@/data/categoryTaxonomy";

export function packageTagFeedUrl(tag: string): string {
  const trimmed = tag.trim().replace(/^#+/, "");
  if (!trimmed) return "/?mode=packages";
  return `/?mode=packages&q=${encodeURIComponent(trimmed)}`;
}

/** Labels shown on package detail — parent category + user tags (no catsub:). */
export function packageDetailTags(category: string, tags: string[] | null | undefined): string[] {
  const out: string[] = [];
  const parentId = parentIdForProjectCategory(category);
  const parent = parentId ? CATEGORY_PARENTS.find((p) => p.id === parentId) : null;
  if (parent?.label) out.push(parent.label);
  else if (category.trim()) out.push(category.trim());

  for (const tag of stripCategorySubTags(tags)) {
    const t = tag.trim();
    if (!t || out.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
  }
  return out;
}
