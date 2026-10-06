import { esc, escA } from "./utils.js";
import { hasThai, thaiConcepts } from "./thai-search.js";
import { isUnsorted, matchesWhy, normalizeOrigin, originOf } from "./origin.js";

/**
 * Search operators for My Vault, e.g. `type:video site:pinterest.com in:"Client A" rights:free tag:poster origin:museum why:color is:unsorted`.
 * Values may be quoted. Unknown keys are left in the free-text part.
 */
const OPERATOR_KEYS = ["type", "site", "in", "rights", "tag", "color", "origin", "why", "is"];
const OPERATOR_RE = /\b(type|site|in|rights|tag|color|origin|why|is):(?:"([^"]*)"|(\S+))/gi;

const TYPE_ALIASES = { image: "image", images: "image", img: "image", photo: "image", video: "video", videos: "video", link: "link", links: "link", url: "link", note: "note", notes: "note", text: "note" };
const RIGHTS_ALIASES = { free: "free", cc0: "free", pd: "free", license: "credit", credit: "credit", stock: "credit", reference: "reference", ref: "reference" };

export function parseOperators(raw) {
  const ops = {};
  const rest = String(raw || "").replace(OPERATOR_RE, (_, key, quotedValue, bare) => {
    const k = key.toLowerCase();
    const v = String(quotedValue ?? bare ?? "").trim().toLowerCase();
    if (v) (ops[k] = ops[k] || []).push(v);
    return " ";
  }).replace(/\s+/g, " ").trim();
  return { rest, ops, count: Object.keys(ops).length };
}

export function sourceHost(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./, "").toLowerCase();
  } catch (e) {
    return "";
  }
}

/**
 * ctx: { rightsOf(item) -> level, collectionNames(item) -> string[], colorFamilyOf(item) -> string }
 * Every operator must match (AND); repeated values of one operator are OR.
 */
export function itemMatchesOperators(item, ops, ctx) {
  if (!ops || !Object.keys(ops).length) return true;
  const tags = ((item.analysis && item.analysis.tags) || []).map(t => String(t).toLowerCase());
  const host = sourceHost(item.sourceUrl);
  const checks = {
    type: v => (TYPE_ALIASES[v] || v) === item.type,
    site: v => !!host && (host === v || host.endsWith("." + v) || host.includes(v)),
    in: v => ctx.collectionNames(item).some(n => n.toLowerCase().includes(v)),
    rights: v => ctx.rightsOf(item) === (RIGHTS_ALIASES[v] || v),
    tag: v => tags.some(t => t === v || t.includes(v)),
    origin: v => originOf(item) === normalizeOrigin(v),
    why: v => matchesWhy(item, v),
    is: v => v === "unsorted" && isUnsorted(item),
    color: v => ctx.colorFamilyOf(item) === v || ((item.analysis && item.analysis.colors) || []).some(c => String(c).toLowerCase() === (v.startsWith("#") ? v : "#" + v)),
  };
  return OPERATOR_KEYS.every(k => !ops[k] || ops[k].some(checks[k]));
}

/** "Saved" filter windows in days. */
export const SAVED_WINDOWS = [["all", "Any time"], ["1", "Today"], ["7", "This week"], ["30", "This month"], ["365", "This year"]];

export function savedWithin(item, days) {
  const d = Number(days);
  if (!d) return true;
  return Date.now() - (Number(item.createdAt) || 0) <= d * 86400000;
}

/** Most common source hosts, for the filter panel. */
export function topSources(items, limit = 6) {
  const counts = new Map();
  items.forEach(i => {
    const h = sourceHost(i.sourceUrl);
    if (h) counts.set(h, (counts.get(h) || 0) + 1);
  });
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([h]) => h);
}

/**
 * Suggestions for the text being typed. pool: [{ kind, value, label? }] — kinds: tag, collection, site, style, artist.
 * Thai input also suggests the English tags it maps to.
 */
export function buildSuggestions(query, pool, limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 1) return [];
  const seen = new Set();
  const out = [];
  const push = s => {
    const key = s.kind + ":" + s.value;
    if (seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push(s);
  };
  if (hasThai(q)) {
    thaiConcepts(q).forEach(variants => push({ kind: "thai", value: variants[0], label: variants[0] }));
  }
  const starts = [], contains = [];
  pool.forEach(s => {
    const v = String(s.label || s.value).toLowerCase();
    if (v.startsWith(q)) starts.push(s);
    else if (v.includes(q)) contains.push(s);
  });
  starts.concat(contains).forEach(push);
  return out;
}

const KIND_LABEL = { tag: "Tag", collection: "Collection", site: "Source", style: "Style", artist: "Artist", category: "Category", thai: "Search" };

export function suggestionsMarkup(list, attr) {
  if (!list.length) return "";
  return `<div class='search-suggest' role='listbox'>${list.map((s, i) => `<button type='button' role='option' class='search-suggest-item' data-${attr}='${escA(JSON.stringify({ kind: s.kind, value: s.value }))}' data-index='${i}'><span class='search-suggest-kind'>${esc(KIND_LABEL[s.kind] || s.kind)}</span><span class='search-suggest-value'>${esc(s.label || s.value)}</span></button>`).join("")}</div>`;
}

/** Text to put in the search box when a suggestion is picked. */
export function suggestionQuery(s) {
  const quote = v => (/\s/.test(v) ? `"${v}"` : v);
  if (s.kind === "collection") return `in:${quote(s.value)}`;
  if (s.kind === "site") return `site:${s.value}`;
  if (s.kind === "tag") return `tag:${quote(s.value)}`;
  return s.value;
}
