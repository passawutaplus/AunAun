/**
 * Learning loop helpers (phase 10). PURE. Everything here is bounded, reviewable and behind LEARN_* flags:
 * privacy filters for captured text, free term suggestions, the capped behaviour boost, and the tuning advice.
 * No per-user profile, no paid AI.
 */
import { normalizeTerm } from "./taxonomy.js";

const THAI = /[฀-๿]/;

// ---------------------------------------------------------------- capture (A): privacy
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const URLISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|th|app|dev)\b)/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const BOT = /(bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python-requests)/i;

/** True when the text looks like personal data (email, phone, URL): such queries are never stored. */
export function looksPersonal(text) {
  const t = String(text || "");
  return EMAIL.test(t) || URLISH.test(t) || PHONE.test(t);
}

export function isBot(userAgent) {
  return !userAgent || BOT.test(String(userAgent));
}

export function langMix(text) {
  const th = THAI.test(text);
  const en = /[a-z]{2,}/i.test(String(text).replace(/[฀-๿]/g, " "));
  return th && en ? "mixed" : th ? "th" : "en";
}

/** Do-Not-Track / Global Privacy Control request headers count as opt-out. */
export function optedOut(headers = {}) {
  return headers["dnt"] === "1" || headers["sec-gpc"] === "1";
}

/** Returns the cleaned query to store, or null when it must not be captured. */
export function captureQuery(text) {
  const q = String(text || "").replace(/\s+/g, " ").trim();
  if (q.length < 2 || q.length > 200 || looksPersonal(q)) return null;
  return q;
}

/** A per-tab random id that can never equal a user id (different alphabet and prefix). */
export function newSessionId(random = () => Math.random()) {
  let s = "s-";
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  for (let i = 0; i < 16; i++) s += alphabet[Math.floor(random() * alphabet.length)];
  return s;
}

// ---------------------------------------------------------------- dictionary growth (C): free suggestions
function levenshtein(a, b, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
      rowMin = Math.min(rowMin, prev[j]);
    }
    if (rowMin > max) return max + 1;
  }
  return prev[b.length];
}

const bigrams = s => {
  const out = new Set();
  const t = s.replace(/\s+/g, "");
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};

/**
 * Nearest existing term for an unknown word: edit distance for Latin, character-bigram overlap for Thai (no segmenter needed).
 * Returns { id, score 0..1, via } or null. Suggestion only; a human approves.
 */
export function suggestTerm(term, tax, { minScore = 0.6 } = {}) {
  const t = normalizeTerm(term);
  if (t.length < 3) return null;
  let best = null;
  const consider = (id, score, via) => { if (score >= minScore && (!best || score > best.score)) best = { id, score: Math.round(score * 100) / 100, via }; };
  if (THAI.test(t)) {
    const a = bigrams(t);
    if (!a.size) return null;
    for (const [syn, id] of Object.entries(tax.synonyms)) {
      if (!THAI.test(syn)) continue;
      const b = bigrams(syn);
      let inter = 0;
      for (const g of a) if (b.has(g)) inter++;
      const dice = (2 * inter) / (a.size + b.size);
      if (dice > 0) consider(id, dice, "thai-overlap");
    }
  } else {
    for (const [syn, id] of Object.entries(tax.synonyms)) {
      if (THAI.test(syn) || Math.abs(syn.length - t.length) > 2) continue;
      const d = levenshtein(t, syn, 2);
      if (d <= 2) consider(id, 1 - d / Math.max(syn.length, t.length), "edit-distance");
    }
  }
  return best;
}

/** Line for docs/dictionary/src/extra/99-learned.txt: { domain, line } where line = "short_id | extra en | extra th". */
export function aliasLine(termId, synonym, lang) {
  const [domain, ...rest] = String(termId).split(".");
  const shortId = rest.join(".");
  if (!domain || !shortId || /[|\n\r]/.test(synonym)) throw new Error("bad alias");
  const clean = String(synonym).replace(/\s+/g, " ").trim().toLowerCase();
  return { domain, line: THAI.test(clean) || lang === "th" ? `${shortId} |  | ${clean}` : `${shortId} | ${clean} | ` };
}

/** Builds the full 99-learned.txt text from proposals [{ term, lang, term_id }], grouped by domain, deterministic. */
export function learnedFile(proposals) {
  const byDomain = new Map();
  for (const p of proposals) {
    const { domain, line } = aliasLine(p.term_id, p.term, p.lang);
    if (!byDomain.has(domain)) byDomain.set(domain, new Set());
    byDomain.get(domain).add(line);
  }
  const out = ["# Learned aliases (phase 10). Approved in /admin/review, exported by scripts/apply-learned.mjs. Do not hand-edit."];
  for (const domain of [...byDomain.keys()].sort()) out.push(`@dom ${domain}`, ...[...byDomain.get(domain)].sort());
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------- ranking boost (D): bounded
export const BOOST_DEFAULTS = { maxBoost: 0.15, minImpressions: 30, halfLifeDays: 60, k: 10, prior: 0.04, exploration: 0.1 };

/** Smoothed save+open rate with time decay of the evidence. eligible=false below minImpressions. */
export function behaviorRate(stats, now = Date.now(), opts = {}) {
  const o = { ...BOOST_DEFAULTS, ...opts };
  const impressions = Number(stats?.impressions) || 0;
  if (impressions < o.minImpressions) return { eligible: false, rate: o.prior };
  const ageDays = Math.max(0, (now - new Date(stats.last_at || stats.lastAt || now).getTime()) / 86400000);
  const decay = 0.5 ** (ageDays / o.halfLifeDays);
  const positives = ((Number(stats.saves) || 0) + 0.5 * (Number(stats.opens) || 0)) * decay;
  const imp = impressions * decay + o.k * 0; // decay both sides so old evidence fades toward the prior
  const rate = (positives + o.k * o.prior) / (imp + o.k);
  return { eligible: true, rate };
}

/** Final score with the boost: never above +maxBoost, never negative, never past 1. Returns the original score when not eligible. */
export function applyBoost(score, stats, now = Date.now(), opts = {}) {
  const o = { ...BOOST_DEFAULTS, ...opts };
  const { eligible, rate } = behaviorRate(stats, now, o);
  if (!eligible) return score;
  const lift = Math.max(0, Math.min(1, (rate - o.prior) / Math.max(o.prior, 0.01)));
  return Math.min(1, score * (1 + o.maxBoost * lift));
}

/**
 * Boost a ranked list without ever changing the membership: required/excluded terms and MIN_SCORE were applied before this.
 * `exploration`: every 10th slot is given to an under-exposed item (fewer than minImpressions) so new items still get seen.
 */
export function boostRanked(entries, behaviorById, now = Date.now(), opts = {}) {
  const o = { ...BOOST_DEFAULTS, ...opts };
  const boosted = entries.map(e => ({ ...e, boosted: applyBoost(e.score, behaviorById.get(e.item.id), now, o) }));
  const byBoost = [...boosted].sort((a, b) => b.boosted - a.boosted);
  const fresh = byBoost.filter(e => !behaviorRate(behaviorById.get(e.item.id), now, o).eligible);
  const slots = Math.floor(byBoost.length * o.exploration);
  if (!slots || !fresh.length) return byBoost;
  const rest = byBoost.filter(e => !fresh.slice(0, slots).includes(e));
  const out = [];
  let f = 0;
  for (let i = 0, r = 0; i < byBoost.length; i++) {
    if ((i + 1) % 10 === 0 && f < Math.min(slots, fresh.length)) out.push(fresh[f++]);
    else if (r < rest.length) out.push(rest[r++]);
  }
  return out.concat(rest.slice(out.length - f).filter(e => !out.includes(e)));
}

// ---------------------------------------------------------------- tuning advice (E): never applied automatically
export function tuningReport({ searches = 0, relaxRate = 0, zeroRate = 0, belowMinResults = 0 } = {}, cfg = {}) {
  const advice = [];
  if (searches < 50) return { advice: ["Not enough searches yet (need 50+) to tune anything."], stats: { searches } };
  if (zeroRate > 0.1) advice.push(`Zero-result rate ${(zeroRate * 100).toFixed(0)}%: add the missing words to the dictionary first; if still high, lower MIN_SCORE from ${cfg.MIN_SCORE} by 0.05.`);
  if (relaxRate > 0.35) advice.push(`Silent relaxation fires on ${(relaxRate * 100).toFixed(0)}% of searches: the catalogue is thin for these topics; consider lowering MIN_RESULTS from ${cfg.MIN_RESULTS} or seeding those topics.`);
  if (relaxRate < 0.05 && zeroRate < 0.03) advice.push(`Results are healthy; you could raise MIN_SCORE a little (now ${cfg.MIN_SCORE}) for sharper results.`);
  if (belowMinResults / Math.max(1, searches) > 0.3) advice.push("Many searches return fewer results than MIN_RESULTS: check TAG_MIN_CONF; too strict a tag threshold leaves items under-tagged.");
  return { advice: advice.length ? advice : ["No change recommended."], stats: { searches, relaxRate, zeroRate } };
}
