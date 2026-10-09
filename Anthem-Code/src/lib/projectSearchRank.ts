import { mapSearchQueryToCategories } from "@/lib/forYouBlend";
import { fuzzyMatchAll, tokenizeQuery } from "@/lib/fuzzyMatch";

export type SearchableProject = {
  title: string;
  owner: string;
  description?: string;
  category: string;
  tags?: string[];
  tools?: string[];
};

const RELAXED_LIMIT = 12;

function normalize(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value: string): string[] {
  const compact = normalize(value).replace(/\s+/g, "");
  if (compact.length < 2) return compact ? [compact] : [];
  const grams: string[] = [];
  for (let i = 0; i < compact.length - 1; i++) grams.push(compact.slice(i, i + 2));
  return grams;
}

/** 0–1 overlap of character pairs, so a hard query still has a nearest project. */
function dice(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.length || !right.length) return 0;
  const counts = new Map<string, number>();
  for (const gram of right) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  let overlap = 0;
  for (const gram of left) {
    const n = counts.get(gram) ?? 0;
    if (n <= 0) continue;
    overlap += 1;
    counts.set(gram, n - 1);
  }
  return (2 * overlap) / (left.length + right.length);
}

function haystackOf(project: SearchableProject): string {
  return [
    project.title,
    project.owner,
    project.description ?? "",
    project.category,
    ...(project.tags ?? []),
    ...(project.tools ?? []),
  ].join(" ");
}

/**
 * Hero project search.
 * Direct hits stay exact. If nothing matches, return the closest projects
 * so the feed does not fall through to an empty state.
 */
export function rankProjectsForSearch<T extends SearchableProject>(
  projects: T[],
  query: string,
): { items: T[]; relaxed: boolean } {
  const q = query.trim();
  if (!q) return { items: projects, relaxed: false };

  const qNorm = normalize(q);
  const tokens = tokenizeQuery(q);
  const categories = mapSearchQueryToCategories(q).map((label) => normalize(label));

  const scored = projects.map((project, index) => {
    const hay = haystackOf(project);
    const hayNorm = normalize(hay);
    const titleNorm = normalize(project.title);
    const categoryNorm = normalize(project.category);
    let score = 0;
    let direct = false;

    if (qNorm && titleNorm.includes(qNorm)) {
      score += 40;
      direct = true;
    } else if (qNorm && hayNorm.includes(qNorm)) {
      score += 24;
      direct = true;
    }
    if (tokens.length > 0 && fuzzyMatchAll(q, hay)) {
      score += 16;
      direct = true;
    }
    for (const token of tokens) {
      if (titleNorm.includes(token)) score += 8;
      else if (hayNorm.includes(token)) score += 4;
    }
    if (categories.some((label) => categoryNorm.includes(label) || label.includes(categoryNorm))) {
      score += 6;
    }
    score += dice(q, project.title) * 10;
    score += dice(q, hay) * 4;

    return { project, score, direct, index };
  });

  const directHits = scored.filter((row) => row.direct);
  if (directHits.length > 0) {
    directHits.sort((a, b) => b.score - a.score || a.index - b.index);
    return { items: directHits.map((row) => row.project), relaxed: false };
  }

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    items: scored.slice(0, RELAXED_LIMIT).map((row) => row.project),
    relaxed: projects.length > 0,
  };
}
