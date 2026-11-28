import { CATEGORY_WORDS, hasWord } from "../lib/categoryWords";
import { isScCategory } from "../lib/categories";

export type OpenCallText = { id: string; title: string; description: string | null; insights: unknown; ends_on: string | null };
type Work = { status: string | null; sc_category: string | null; tags: string[] | null; tools: string[] | null };

/**
 * What kind of work this person makes (owner 2026-11-28: "posts many Graphic works → Graphic open calls
 * first"): each published work counts 3 for its CATEGORY, 1 for each tag and tool; the CATEGORIES on the
 * profile count 2. Returns weighted words to look for.
 */
export function interestWords(works: readonly Work[], profileCats: readonly string[] | null | undefined): Map<string, number> {
  const w = new Map<string, number>();
  const add = (word: string, n: number) => {
    const k = word.trim().toLowerCase().replace(/^#+/, "");
    if (k.length < 2) return;
    w.set(k, (w.get(k) ?? 0) + n);
  };
  const addCat = (cat: string, n: number) => {
    if (!isScCategory(cat)) return;
    add(cat, n);
    for (const word of CATEGORY_WORDS[cat]) add(word, n);
  };
  for (const work of works) {
    if (work.status !== "Published") continue;
    if (work.sc_category) addCat(work.sc_category, 3);
    for (const t of work.tags ?? []) if (t && !t.includes(":")) add(t, 1);
    for (const t of work.tools ?? []) if (t) add(t, 1);
  }
  for (const c of profileCats ?? []) addCat(c, 2);
  return w;
}

const textOf = (e: OpenCallText) => `${e.title} ${e.description ?? ""} ${e.insights ? JSON.stringify(e.insights) : ""}`.toLowerCase();

/** Open calls that fit the person best first, then the ones closing soonest (no fit = soonest first). */
export function rankOpenCalls<T extends OpenCallText>(calls: readonly T[], words: Map<string, number>): T[] {
  const scored = calls.map((e) => {
    const text = textOf(e);
    let s = 0;
    for (const [word, n] of words) if (hasWord(text, word)) s += n;
    return { e, s };
  });
  return scored.sort((a, b) => b.s - a.s || (a.e.ends_on ?? "9999").localeCompare(b.e.ends_on ?? "9999")).map((x) => x.e);
}
