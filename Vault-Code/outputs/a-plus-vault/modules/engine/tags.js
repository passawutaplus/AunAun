/**
 * Tag logic shared by the seeder, the user-item enrichment and (later) search: term matching over free text,
 * source-metadata mapping, merging with source weights, per-group limits, implied parents, unknown ids dropped.
 * `tax` is a loaded taxonomy (lib/engine/taxonomy.mjs loadTaxonomy).
 */
import { normalizeTerm } from "./taxonomy.js";

export const CROSS_CUTTING = new Set(["sty", "mat", "mood", "sub"]);
/** Source weight: code/meta are facts, user is intent, ai is a guess (phase 05.F). */
export const SOURCE_WEIGHT = { code: 1, meta: 1, inherited: 0.9, user: 0.95, client: 0.7, ai: 0.8, implied: 0.5 };

const THAI = /[฀-๿]/;
const cache = new WeakMap();

function indexFor(tax) {
  let idx = cache.get(tax);
  if (!idx) {
    const latin = new Map();
    const thai = [];
    for (const [text, id] of Object.entries(tax.synonyms)) {
      if (THAI.test(text)) { if (text.length >= 2) thai.push([text, id]); } else latin.set(text, id);
    }
    thai.sort((a, b) => b[0].length - a[0].length);
    idx = { latin, thai, maxWords: Math.max(1, ...[...latin.keys()].map(k => k.split(" ").length)) };
    cache.set(tax, idx);
  }
  return idx;
}

/**
 * Finds dictionary terms in free text (mixed Thai/English). Longest match first, each id once.
 * `onlyGroups` (Set of group ids or prefixes ending with ".") restricts the vocabulary.
 * Returns [{ id, text }].
 */
export function matchTerms(text, tax, { onlyGroups = null } = {}) {
  const hay = normalizeTerm(text);
  if (!hay) return [];
  const idx = indexFor(tax);
  const allowed = id => {
    if (!onlyGroups) return true;
    const g = tax.termById.get(id)?.group;
    return onlyGroups.has(g);
  };
  const found = new Map();
  // Latin: n-grams over word tokens (longest first at each position).
  const words = hay.split(/[^a-z0-9À-ɏ]+/).filter(Boolean);
  for (let i = 0; i < words.length; ) {
    let hit = false;
    for (let n = Math.min(idx.maxWords, words.length - i); n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(" ");
      const candidates = [phrase, ...(n === 1 ? singulars(phrase) : [])];
      for (const c of candidates) {
        const id = idx.latin.get(c);
        if (id && allowed(id)) { if (!found.has(id)) found.set(id, phrase); i += n; hit = true; break; }
      }
      if (hit) break;
    }
    if (!hit) i++;
  }
  // Thai: no spaces, so substring match; longer synonyms first and consumed so "บ้านเดี่ยว" does not also match "บ้าน".
  if (THAI.test(hay)) {
    let rest = hay;
    for (const [syn, id] of idx.thai) {
      if (rest.includes(syn) && allowed(id)) {
        if (!found.has(id)) found.set(id, syn);
        rest = rest.split(syn).join(" ");
      }
    }
  }
  return [...found].map(([id, t]) => ({ id, text: t }));
}

function singulars(w) {
  const out = [];
  if (w.length > 4 && w.endsWith("ies")) out.push(w.slice(0, -3) + "y");
  if (w.length > 3 && w.endsWith("es")) out.push(w.slice(0, -2));
  if (w.length > 3 && w.endsWith("s")) out.push(w.slice(0, -1));
  return out;
}

const groupSet = (tax, domainCodes, suffixes) => new Set(tax.groups.filter(g => domainCodes.includes(g.domain) && (!suffixes || suffixes.some(s => g.id.endsWith(s)))).map(g => g.id));

/**
 * Maps adapter hints to dictionary tags (conf 0.8, src "meta") and layer-B column values.
 * hints: { title, description, classification, medium, era, culture, creator, institution, year, keywords[] }
 */
export function tagsFromMetadata(hints, tax) {
  const h = hints || {};
  const tags = [];
  const push = (matches, conf = 0.8) => matches.forEach(m => tags.push({ id: m.id, conf, src: "meta" }));
  const disciplines = tax.domains.map(d => d.code).filter(c => !CROSS_CUTTING.has(c));
  if (h.classification) push(matchTerms(h.classification, tax, { onlyGroups: groupSet(tax, disciplines) }), 0.85);
  if (h.era) push(matchTerms(String(h.era), tax, { onlyGroups: new Set(["sty.era"]) }));
  if (h.culture) push(matchTerms(String(h.culture), tax, { onlyGroups: new Set(["sty.culture"]) }));
  if (h.medium) push(matchTerms(h.medium, tax, { onlyGroups: groupSet(tax, ["mat", "crf", "ill"]) }));
  const free = [h.title, h.description, ...(Array.isArray(h.keywords) ? h.keywords : [])].filter(Boolean).join(" . ");
  if (free) push(matchTerms(free, tax));
  const year = Number.parseInt(String(h.year ?? "").match(/-?\d{3,4}/)?.[0] ?? "", 10);
  return {
    tags,
    layerB: {
      era: h.era ? String(h.era).slice(0, 80) : null,
      culture_region: h.culture ? String(h.culture).slice(0, 80) : null,
      medium: h.medium ? String(h.medium).slice(0, 120) : null,
      institution: h.institution ? String(h.institution).slice(0, 120) : null,
      year: Number.isFinite(year) ? year : null,
    },
  };
}

/** Discipline domain codes present among tags, ordered by total confidence. */
export function detectDomains(tags, tax) {
  const score = new Map();
  for (const t of tags) {
    const d = tax.termById.get(t.id)?.domain;
    if (d && !CROSS_CUTTING.has(d)) score.set(d, (score.get(d) || 0) + (t.conf ?? 0));
  }
  return [...score].sort((a, b) => b[1] - a[1]).map(([d]) => d);
}

const rank = t => (t.conf ?? 0) * (SOURCE_WEIGHT[t.src] ?? 0.5);

/**
 * Merges tag lists. Same id: highest weighted confidence wins (user edits are applied by the caller with src "user" conf 1).
 * Unknown ids are dropped; facet comes from the taxonomy; each group keeps its best `maxPerImage`.
 * Returns { tagsJson (all kept), tagsIds (conf >= minConf, plus implied parents) }.
 */
export function mergeTags(lists, tax, { minConf = 0.6 } = {}) {
  const best = new Map();
  for (const t of lists.flat()) {
    const term = tax.termById.get(t?.id);
    if (!term) continue;
    const cand = { id: t.id, facet: term.group, conf: Math.max(0, Math.min(1, Number(t.conf) || 0)), src: t.src || "ai" };
    const cur = best.get(cand.id);
    if (!cur || rank(cand) > rank(cur)) best.set(cand.id, cand);
  }
  const byGroup = new Map();
  for (const t of best.values()) {
    if (!byGroup.has(t.facet)) byGroup.set(t.facet, []);
    byGroup.get(t.facet).push(t);
  }
  const kept = [];
  for (const [gid, list] of byGroup) {
    const max = tax.groupById.get(gid)?.maxPerImage;
    list.sort((a, b) => rank(b) - rank(a));
    kept.push(...(max ? list.slice(0, max) : list));
  }
  kept.sort((a, b) => rank(b) - rank(a));
  const ids = new Set(kept.filter(t => t.conf >= minConf).map(t => t.id));
  for (const id of [...ids]) for (let p = tax.termById.get(id)?.parent; p; p = tax.termById.get(p)?.parent) ids.add(p);
  return { tagsJson: kept, tagsIds: [...ids] };
}

/** Count of confident tags (what the publish rule uses; parents do not count twice). */
export const confidentCount = (tagsJson, minConf = 0.6) => tagsJson.filter(t => t.conf >= minConf).length;

/** Alt text from tags by template (no AI). Thai and English. */
export function altTextFromTags(tagsJson, tax) {
  const top = tagsJson.filter(t => t.conf >= 0.6).slice(0, 4);
  const pick = (lang) => top.map(t => { const term = tax.termById.get(t.id); return (lang === "th" ? term.th[0] : term.en[0]) || term.en[0] || term.th[0]; }).filter(Boolean);
  const th = pick("th"), en = pick("en");
  return { alt_text_th: th.length ? "ภาพอ้างอิง: " + th.join(" · ") : null, alt_text_en: en.length ? "Reference image: " + en.join(", ") : null };
}
