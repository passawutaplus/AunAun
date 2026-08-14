import { CATEGORY_PARENTS } from "@/data/categoryTaxonomy";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function nearby(query: string, candidate: string): boolean {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c || q === c) return false;
  if (c.includes(q) || q.includes(c)) return true;
  if (q.length >= 3 && c.startsWith(q.slice(0, 3))) return true;
  return false;
}

/** Similar queries when search has zero hits — recents + category labels, not a spellchecker. */
export function similarSearchSuggestions(
  query: string,
  recents: string[],
  extra: string[] = [],
  limit = 5,
): string[] {
  const q = query.trim();
  if (!q) return [];
  const pool = [
    ...recents,
    ...extra,
    ...CATEGORY_PARENTS.map((p) => p.label),
    ...CATEGORY_PARENTS.flatMap((p) => p.subs.map((s) => s.label)),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of pool) {
    const label = item.trim();
    if (!label || seen.has(normalize(label))) continue;
    if (!nearby(q, label)) continue;
    seen.add(normalize(label));
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}
