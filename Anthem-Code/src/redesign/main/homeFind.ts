import { fuzzyMatchAll, tokenizeQuery } from "@/lib/fuzzyMatch";

/**
 * The home grid's text filter: `/?find=poster` (Showcase), `/?tab=creators&find=` (Creators). The store
 * app's search screen sends it (owner: search filters the feed, like the old app). `?q=` stays the search
 * box of Google → the search panel, and `?tab=event&q=` the Event search.
 */
export const FIND_PARAM = "find";

/**
 * The old feed's search rule (FeedPage toolbar search), no AI: the term inside any field; or, with several
 * words, every word somewhere in any order (small typos and short forms like "ps" → Photoshop count).
 */
export function matchesFind(query: string, fields: readonly (string | null | undefined)[]): boolean {
  const q = query.trim().toLocaleLowerCase("th");
  if (!q) return true;
  const text = fields.filter((f): f is string => !!f);
  if (text.some((f) => f.toLocaleLowerCase("th").includes(q))) return true;
  return tokenizeQuery(q).length > 1 && fuzzyMatchAll(q, text.join(" "));
}
