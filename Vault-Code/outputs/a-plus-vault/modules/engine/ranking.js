/**
 * Ranking + find-similar (phase 06). PURE: parsed query + candidate items in, ordered results out. No AI.
 * item = { id, tags_ids: [id], tags_json?: [{id,conf}], palette?: [{hex,pct}], quality_score?, tags?: [keywords], era? }
 */
import { deltaE, hexToRgb, rgbToLab } from "./palette.js";
import { applyBoost } from "./learning.js";

const CROSS = new Set(["sty", "mat", "mood", "sub"]);
const dom = (tax, id) => tax.termById.get(id)?.domain;
const grp = (tax, id) => tax.termById.get(id)?.group;

const confMap = item => {
  const m = new Map();
  for (const t of item.tags_json || []) m.set(t.id, Number(t.conf) || 1);
  return m;
};

/** 0..1 closeness of a #hex to the nearest sizeable palette colour (CIELAB distance, never image pixels). */
export function colorCloseness(hex, palette, cfg) {
  const rgb = hexToRgb(hex);
  const target = rgbToLab(rgb[0], rgb[1], rgb[2]);
  const reach = (cfg.COLOR_QUERY_DELTA_E ?? 18) * 2;
  let best = 0;
  for (const p of palette || []) {
    if ((p.pct ?? 1) < 0.05) continue;
    const c = hexToRgb(p.hex);
    const d = deltaE(target, rgbToLab(c[0], c[1], c[2]));
    best = Math.max(best, Math.max(0, 1 - d / reach));
  }
  return best;
}

/** Score one item against include terms. Returns null when the item is excluded or misses a required term. */
export function scoreItem(query, item, tax, cfg, include = query.include) {
  const have = new Set(item.tags_ids || []);
  for (const id of query.exclude) if (have.has(id)) return null;
  const kw = new Set((item.tags || []).map(k => String(k).toLowerCase()));
  for (const k of query.pinnedKeywords) if (!kw.has(k)) return null;
  const conf = confMap(item);
  let got = 0, total = 0, matched = 0;
  const matchedTags = [], missingTags = [];
  for (const term of include) {
    total += term.weight;
    if (have.has(term.id)) {
      got += term.weight * (conf.get(term.id) ?? 1);
      matched++;
      matchedTags.push(term.id);
    } else if (term.required) {
      return null;
    } else {
      missingTags.push(term.id);
    }
  }
  const colorWeight = query.context.intent === "color_reference" ? 2 : 1;
  for (const hex of query.colorIntent.hex) {
    total += colorWeight;
    const c = colorCloseness(hex, item.palette, cfg);
    got += colorWeight * c;
    if (c >= 0.5) matched++;
  }
  if (total === 0) return { score: 0, matched, matchedTags, missingTags, count: include.length + query.colorIntent.hex.length };
  const quality = typeof item.quality_score === "number" ? 0.05 * (item.quality_score / 100) : 0;
  return { score: Math.min(1, got / total + quality), matched, matchedTags, missingTags, count: include.length + query.colorIntent.hex.length };
}

const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return A.size + B.size - inter ? inter / (A.size + B.size - inter) : 0;
};

/** Maximal Marginal Relevance reorder. `rel` is each entry's relevance 0..1. */
export function mmr(entries, lambda = 0.7, limit = entries.length) {
  const pool = entries.map(e => ({ e, rel: e.rel }));
  const out = [];
  while (pool.length && out.length < limit) {
    let bestI = 0, bestV = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const sim = out.length ? Math.max(...out.map(o => jaccard(pool[i].e.item.tags_ids || [], o.item.tags_ids || []))) : 0;
      const v = lambda * pool[i].rel - (1 - lambda) * sim;
      if (v > bestV) { bestV = v; bestI = i; }
    }
    out.push(pool.splice(bestI, 1)[0].e);
  }
  return out;
}

/** Interleaves coverage buckets (5/5, 4/5, 3/5 ...) so partial matches are mixed in with full ones. */
export function interleaveByCoverage(scored) {
  const buckets = new Map();
  for (const s of scored) {
    if (!buckets.has(s.matched)) buckets.set(s.matched, []);
    buckets.get(s.matched).push(s);
  }
  const lists = [...buckets.entries()].sort((a, b) => b[0] - a[0]).map(([, l]) => l.sort((a, b) => b.score - a.score));
  const out = [];
  for (let round = 0; lists.some(l => l.length > round); round++) for (const l of lists) if (l.length > round) out.push(l[round]);
  return out;
}

function runOnce(query, items, tax, cfg, include) {
  const scored = [];
  for (const item of items) {
    const r = scoreItem(query, item, tax, cfg, include);
    if (r && r.score >= cfg.MIN_SCORE && (r.matched > 0 || r.count === 0)) scored.push({ item, ...r });
  }
  return scored;
}

/**
 * Main entry. Precision-first: below MIN_SCORE is dropped even when the page is short. If fewer than MIN_RESULTS
 * remain, the lowest-weight constraint is dropped and the query re-run, silently (never required/exclude or the discipline).
 */
export function rankItems(query, items, tax, cfg, { limit = 30, offset = 0, behavior = null, now = Date.now() } = {}) {
  const pinned = query.include.some(t => t.required) || query.pinned.length > 0;
  let include = [...query.include];
  let scored = runOnce(query, items, tax, cfg, include);
  while (scored.length < cfg.MIN_RESULTS) {
    const relaxable = include.filter(t => !t.required && !(query.context.domain && dom(tax, t.id) === query.context.domain));
    if (!relaxable.length || include.length <= 1) break;
    const drop = relaxable.reduce((a, b) => (b.weight < a.weight ? b : a));
    include = include.filter(t => t !== drop);
    scored = runOnce(query, items, tax, cfg, include);
  }
  // Bounded behaviour boost (phase 10, flag LEARN_RANK_TUNING): changes order only, never membership (MIN_SCORE, required, excluded were applied above).
  if (behavior) scored = scored.map(e => ({ ...e, score: applyBoost(e.score, behavior.get(e.item.id), now) }));
  const ordered = pinned ? [...scored].sort((a, b) => b.score - a.score) : interleaveByCoverage(scored);
  const n = ordered.length;
  const withRel = ordered.map((e, i) => ({ ...e, rel: 0.5 * e.score + 0.5 * (1 - i / Math.max(1, n)) }));
  const diverse = mmr(withRel.slice(0, 200), cfg.MMR_LAMBDA ?? 0.7).concat(withRel.slice(200));
  const page = diverse.slice(offset, offset + limit);
  // Missing tags are always reported against the ORIGINAL query so the viewer can offer to require them.
  const original = query.include.map(t => t.id);
  return {
    total: n,
    nextOffset: offset + limit < n ? offset + limit : null,
    relaxed: query.include.length - include.length,
    items: page.map(e => {
      const have = new Set(e.item.tags_ids || []);
      return { id: e.item.id, score: Math.round(e.score * 1000) / 1000, matchedTags: original.filter(id => have.has(id)), missingTags: original.filter(id => !have.has(id)), item: e.item };
    }),
  };
}

// ---------------------------------------------------------------- find similar
const facetWeight = (tax, id) => {
  const g = grp(tax, id);
  if (!g) return 1;
  if (!CROSS.has(dom(tax, id))) return 3;
  if (g.startsWith("sty.")) return 2;
  if (g === "mood.mood" || g.startsWith("mat.") || g.startsWith("sub.")) return 1.5;
  return 1;
};
const isMoodTone = (tax, id) => ["mood.mood", "mood.tone", "mood.hue"].includes(grp(tax, id));

export function paletteSimilarity(a, b, cfg) {
  const top = (a || []).filter(p => (p.pct ?? 1) >= 0.08).slice(0, 3);
  if (!top.length || !(b || []).length) return 0;
  return top.reduce((n, p) => n + colorCloseness(p.hex, b, cfg), 0) / top.length;
}

/**
 * "More like this" (weighted tag overlap by facet + hierarchy via stored parents + palette + same era).
 * opposite=true keeps the discipline/subject but inverts mood/tone/colour.
 */
export function findSimilar(target, items, tax, cfg, { limit = 24, offset = 0, seen = [], opposite = false } = {}) {
  const tTags = new Set(target.tags_ids || []);
  const tConf = confMap(target);
  const seenSet = new Set([target.id, ...seen]);
  let denom = 0, moodDenom = 0;
  for (const id of tTags) { const w = facetWeight(tax, id) * (tConf.get(id) ?? 1); denom += w; if (isMoodTone(tax, id)) moodDenom += w; }
  const scored = [];
  for (const item of items) {
    if (seenSet.has(item.id)) continue;
    const have = new Set(item.tags_ids || []);
    const cConf = confMap(item);
    let shared = 0, sharedMood = 0;
    for (const id of tTags) {
      if (!have.has(id)) continue;
      const w = facetWeight(tax, id) * Math.min(tConf.get(id) ?? 1, cConf.get(id) ?? 1);
      if (isMoodTone(tax, id)) sharedMood += w; else shared += w;
    }
    const base = denom - moodDenom > 0 ? shared / (denom - moodDenom) : 0;
    const pal = paletteSimilarity(target.palette, item.palette, cfg);
    const era = target.era && item.era && target.era === item.era ? 0.05 : 0;
    const moodSim = moodDenom > 0 ? sharedMood / moodDenom : 0;
    const score = opposite ? 0.6 * base + 0.3 * (1 - moodSim) + 0.1 * (1 - pal) : 0.55 * base + 0.25 * moodSim + 0.2 * pal + era;
    if (score >= (cfg.MIN_SCORE ?? 0.5) * (opposite ? 0.9 : 0.6) && base > 0) scored.push({ item, score, rel: score });
  }
  scored.sort((a, b) => b.score - a.score);
  const diverse = mmr(scored.slice(0, 120), cfg.MMR_LAMBDA ?? 0.7).concat(scored.slice(120));
  return { total: diverse.length, nextOffset: offset + limit < diverse.length ? offset + limit : null, items: diverse.slice(offset, offset + limit).map(e => ({ id: e.item.id, score: Math.round(e.score * 1000) / 1000, item: e.item })) };
}
