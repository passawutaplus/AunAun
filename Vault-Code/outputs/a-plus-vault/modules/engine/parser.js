/**
 * Sentence parser (phase 06). PURE, no AI, no network: mixed Thai/English text -> structured query.
 *
 *   parseQuery(text, tax, cfg) -> {
 *     context: { domains: [{code, score}], domain: code|null, intent },
 *     include: [{ id, weight, required? }], exclude: [ids],
 *     colorIntent: { hex: [#rrggbb], hues: [mood.hue ids] },
 *     pinned: [ids], pinnedKeywords: [text],
 *     price: { amount, unit, soft } | null,
 *     unknown: [{ term, lang }], chips: [{ id, label, kind, weight }], listPalettes: bool
 *   }
 *
 * One synonym index (th + en + phrases) over the whole query, sliding window, longest match first.
 * Thai is segmented with Intl.Segmenter('th') (browser and Node); if it is unavailable we fall back to
 * longest-match over characters. `cfg` = config/engine.json constants, `rules` = docs/engine-config.json
 * (loaded into taxonomy as words/cues/languageRules by buildTaxonomy).
 */
import { normalizeTerm } from "./taxonomy.js";

const THAI = /[฀-๿]/;
const THAI_TONES = /[่-๋]/g; // ไม้เอก โท ตรี จัตวา
const LATIN_DIACRITICS = /[̀-ͯ]/g;

// ---------------------------------------------------------------- normalisation
export function normalizeLatin(text, rules = {}) {
  let t = text.normalize("NFD").replace(/([a-zA-Z])[̀-ͯ]+/g, "$1").normalize("NFC").toLowerCase();
  t = t.replace(/[-_‐-–]/g, " ").replace(/['’]s\b/g, "");
  const abbr = rules.abbrev_expand || {};
  return t.replace(/\b[a-z&]{2,4}\b/g, w => abbr[w] ?? w);
}

/** Match-time Thai normalisation: drop tone marks, unify loanword final ค->ก. Applied to BOTH index keys and query. */
export function normalizeThaiForMatch(text) {
  return text.replace(THAI_TONES, "").replace(/ค(?=\s|$)/g, "ก");
}

/** Normalises any text for matching (keeps Thai and Latin runs as they are, separated by single spaces). */
export function matchForm(text, rules = {}, { keepTone = false } = {}) {
  const base = String(text || "").normalize("NFC");
  const parts = base.split(/(?<=[฀-๿])(?=[A-Za-z0-9])|(?<=[A-Za-z0-9])(?=[฀-๿])/);
  return parts
    .map(p => (THAI.test(p) ? (keepTone ? p.replace(/ค(?=\s|$)/g, "ก") : normalizeThaiForMatch(p)) : normalizeLatin(p, rules)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------- index (built once per taxonomy)
const indexCache = new WeakMap();

function indexFor(tax) {
  let idx = indexCache.get(tax);
  if (idx) return idx;
  const rules = tax.languageRules || {};
  const map = new Map(); // normalised key (spaces removed for Thai) -> [[id, weight]]
  const toned = new Map(); // same key -> Set of tone-marked originals (to keep ไม้ (wood) apart from ไม่ (not))
  const add = (key, tags) => {
    const k = keyOf(matchForm(key, rules));
    if (!k) return;
    if (!map.has(k)) map.set(k, tags);
    if (!toned.has(k)) toned.set(k, new Set());
    toned.get(k).add(keyOf(matchForm(key, rules, { keepTone: true })));
  };
  // Phrases first: an idiom ("ดูแพงๆ") must win over a plain synonym with the same text.
  for (const p of tax.phrases || []) for (const m of p.match) add(m, p.tags);
  for (const [text, id] of Object.entries(tax.synonyms)) add(text, [[id, 1]]);
  const latinKeys = [...map.keys()].filter(k => !THAI.test(k) && !k.includes(" ") && k.length >= (rules.fuzzy?.latin_min_len ?? 6));
  idx = { map, toned, latinKeys, rules };
  indexCache.set(tax, idx);
  return idx;
}

/** Lookup key: Thai-only strings compare without spaces ("ไม้ ระแนง" == "ไม้ระแนง"); Latin keeps single spaces. */
function keyOf(form) {
  return THAI.test(form) && !/[a-z0-9]/.test(form) ? form.replace(/\s+/g, "") : form;
}

// ---------------------------------------------------------------- tokenizer
let segmenter = null;
function thaiSegments(run) {
  try {
    segmenter ??= new Intl.Segmenter("th", { granularity: "word" });
    return [...segmenter.segment(run)].map(s => s.segment).filter(s => s.trim());
  } catch {
    return [...run];
  }
}

/** Splits into tokens by script (Thai runs segmented, Latin by spaces/punctuation, numbers kept). */
export function tokenize(raw, rules = {}) {
  const tokens = [];
  const text = String(raw || "").normalize("NFC");
  const runs = text.match(/#[A-Za-z0-9_฀-๿-]+|[฀-๿]+|[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'&’-]*|#?[0-9][0-9.,]*|#[0-9a-fA-F]+|[^\s]/g) || [];
  for (const run of runs) {
    if (THAI.test(run)) {
      for (const seg of thaiSegments(run)) tokens.push({ raw: seg, form: normalizeThaiForMatch(seg), toned: seg.replace(/ค(?=\s|$)/g, "ก"), thai: true });
    } else {
      tokens.push({ raw: run, form: normalizeLatin(run, rules).trim(), toned: run, thai: false });
    }
  }
  // ๆ repeats the previous word: drop the mark, the word is already present once (match is on the stem).
  return tokens.filter(t => t.form && t.form !== "ๆ" && t.raw !== "ๆ").map(t => (t.form.endsWith("ๆ") ? { ...t, form: t.form.slice(0, -1) } : t));
}

/** The Thai segmenter splits multi-word modifiers ("อยาก|ได้", "ไม่|เอา"); glue them back when the joined form is a known modifier. */
function mergeModifierTokens(tokens, keys) {
  const out = [];
  for (let i = 0; i < tokens.length; ) {
    let merged = false;
    for (let n = Math.min(3, tokens.length - i); n >= 2 && !merged; n--) {
      const win = tokens.slice(i, i + n);
      if (!win.every(t => t.thai)) continue;
      const form = win.map(t => t.form).join("");
      if (keys.has(form)) {
        out.push({ raw: win.map(t => t.raw).join(""), form, toned: win.map(t => t.toned).join(""), thai: true });
        i += n;
        merged = true;
      }
    }
    if (!merged) out.push(tokens[i++]);
  }
  return out;
}

const joinKey = toks => keyOf(toks.map(t => t.form).join(" ").replace(/\s+/g, " ").trim());

// ---------------------------------------------------------------- fuzzy (Latin only)
function withinOneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function fuzzyLookup(word, idx) {
  const f = idx.rules.fuzzy || {};
  if (!f.max_edit || word.length < (f.latin_min_len ?? 6) || THAI.test(word)) return null;
  const hits = idx.latinKeys.filter(k => withinOneEdit(word, k));
  if (hits.length !== 1) return null; // accepted only when exactly ONE term matches
  return { tags: idx.map.get(hits[0]), conf: f.conf ?? 0.7 };
}

// ---------------------------------------------------------------- main
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function expandHex(h) {
  const v = h.replace("#", "").toLowerCase();
  return "#" + (v.length === 3 ? v.split("").map(c => c + c).join("") : v);
}

export function parseQuery(text, tax, cfg = {}) {
  const idx = indexFor(tax);
  const rules = idx.rules;
  const words = tax.words;
  const set = arr => new Set((arr || []).map(w => matchForm(w, rules)));
  // "ห้ามมี"/"ไม่เอา" appear in must_words too, but they PROHIBIT: they belong with negation, not "required".
  const prohibit = w => /^(ห้าม|ไม่)/.test(w) || /^(no|without|not)\b/.test(w);
  const must = set((words.must || []).filter(w => !prohibit(w))), soft = set(words.soft);
  const neg = set([...(words.negation || []), ...(words.must || []).filter(prohibit)]);
  const connector = set(words.connector), filler = set(words.filler), ignore = set(words.ignore);
  const N = w => matchForm(w, rules);
  const CONNECT = new Set(["แต่", "และ", "ที่", "เพื่อ"].map(N));
  const BUT = new Set(["แต่", "but"].map(N));
  const TINY = new Set(["หน่อย", "นิดหน่อย", "นิดๆ", "นิด", "bit", "slightly"].map(N));
  const VERY = new Set(["มาก", "very", "มากๆ"].map(N));
  const intentCues = tax.intentCues || {};
  const maxWin = Math.max(rules.multiword_window ?? 4, 6);

  const modifierKeys = new Set([...must, ...soft, ...neg, ...connector, ...filler, ...ignore, ...CONNECT, ...BUT, ...TINY, ...VERY].map(w => w.replace(/\s+/g, "")));
  const cueSquash = new Set([...Object.values(intentCues).flat(), ...Object.values(tax.domainCues || {}).flat()].map(c => N(c).replace(/\s+/g, "")));
  const out = {
    context: { domains: [], domain: null, intent: "inspiration", intents: [] },
    include: [], exclude: [], colorIntent: { hex: [], hues: [] }, pinned: [], pinnedKeywords: [],
    price: null, unknown: [], chips: [], listPalettes: false,
  };
  const raw = String(text || "").trim();
  if (!raw) return out;

  const tokens = mergeModifierTokens(tokenize(raw, rules), modifierKeys);
  const squash = tokens.map(t => t.form).join("").replace(/\s+/g, "");
  const used = new Array(tokens.length).fill(false);
  const hits = []; // { id, weight, at, len, src }
  const addHit = (tags, at, len, scale = 1) => {
    for (let k = at; k < at + len; k++) used[k] = true;
    for (const [id, w] of tags) hits.push({ id, weight: w * scale, at, len });
  };

  // ---- syntax: #hex / #tag / palette listing
  for (let i = 0; i < tokens.length; i++) {
    const f = tokens[i].raw;
    if (f.startsWith("#") && f.length > 1) {
      const name = f.slice(1);
      const asTag = tax.lookup(name);
      if (HEX.test(f) && !asTag) { out.colorIntent.hex.push(expandHex(f)); used[i] = true; }
      else if (asTag) { out.pinned.push(asTag); used[i] = true; }
      else { out.pinnedKeywords.push(name.toLowerCase()); used[i] = true; }
    }
  }
  if (tokens.length === 1 && ["colors", "color", "palette", "palettes", "สี"].includes(tokens[0].form)) out.listPalettes = true;

  // ---- pass 1: money (soft signal only)
  for (let i = 0; i < tokens.length; i++) {
    const m = /^[0-9][0-9.,]*$/.test(tokens[i].raw) ? Number(tokens[i].raw.replace(/,/g, "")) : NaN;
    const unit = tokens[i + 1]?.form;
    const U = { [N("ล้าน")]: 1e6, million: 1e6, m: 1e6, [N("พัน")]: 1e3, k: 1e3, [N("หมื่น")]: 1e4, [N("แสน")]: 1e5, [N("บาท")]: 1, baht: 1, thb: 1 };
    if (Number.isFinite(m) && unit && unit in U) {
      const mult = U[unit];
      out.price = { amount: m * mult, unit, soft: Math.min(cfg.PRICE_SOFT_MAX ?? 0.3, 0.3) };
      used[i] = used[i + 1] = true;
    }
  }

  // ---- pass 2: longest-match over the whole token stream
  for (let i = 0; i < tokens.length; ) {
    if (used[i]) { i++; continue; }
    let matched = false;
    for (let n = Math.min(maxWin, tokens.length - i); n >= 1 && !matched; n--) {
      if (used.slice(i, i + n).some(Boolean)) continue;
      const win = tokens.slice(i, i + n);
      const key = joinKey(win);
      const tags = idx.map.get(key);
      if (!tags || (n === 1 && (filler.has(win[0].form) || connector.has(win[0].form)))) continue;
      // A short Thai word must equal a dictionary form WITH its tone marks: "ไม่" (not) is not "ไม้" (wood), "ตัว" is not "ตั๋ว".
      if (n === 1 && win[0].thai && win[0].raw.length <= 3 && !idx.toned.get(key)?.has(keyOf(win[0].toned))) continue;
      addHit(tags, i, n); i += n; matched = true;
    }
    if (matched) continue;
    const t = tokens[i];
    const fz = !t.thai ? fuzzyLookup(t.form, idx) : null;
    if (fz) addHit(fz.tags, i, 1, fz.conf);
    i++;
  }

  // ---- modifiers: negation / must / soft / very / "แต่" clause weight
  const dir = (at, len) => ({ before: tokens.slice(Math.max(0, at - 2), at), after: tokens.slice(at + len, at + len + 2) });
  const clauseAt = new Array(tokens.length).fill(0);
  let clause = 0;
  tokens.forEach((t, i) => { if (BUT.has(t.form)) clause++; clauseAt[i] = clause; });
  const include = new Map();
  const exclude = new Set();
  for (const h of hits) {
    const { before, after } = dir(h.at, h.len);
    const near = [...before.slice(-2), ...after.slice(0, 1)].map(t => t.form);
    const beforeForms = before.map(t => t.form);
    let weight = h.weight;
    let required = false;
    if (beforeForms.some(f => neg.has(f))) { exclude.add(h.id); continue; }
    if (beforeForms.some(f => must.has(f))) required = true;
    if (near.some(f => TINY.has(f))) weight *= 0.5;
    else if (near.some(f => soft.has(f))) weight *= 0.8;
    if (near.some(f => VERY.has(f))) weight *= 1.3;
    if (clauseAt[h.at] > 0) weight *= 0.5;
    const cur = include.get(h.id);
    if (!cur || weight > cur.weight) include.set(h.id, { id: h.id, weight: Math.round(weight * 1000) / 1000, required: required || cur?.required || undefined });
  }
  for (const id of exclude) include.delete(id);

  // ---- context: domain vote, intent
  const votes = new Map();
  for (const { id, weight } of include.values()) {
    const d = tax.termById.get(id)?.domain;
    if (d && !["sty", "mat", "mood", "sub"].includes(d)) votes.set(d, (votes.get(d) || 0) + weight);
  }
  for (const [code, cues] of Object.entries(tax.domainCues || {})) {
    for (const cue of cues) if (squash.includes(matchForm(cue, rules).replace(/\s+/g, ""))) votes.set(code, (votes.get(code) || 0) + 0.5);
  }
  const total = [...votes.values()].reduce((a, b) => a + b, 0);
  const ranked = [...votes].sort((a, b) => b[1] - a[1]);
  out.context.domains = ranked.map(([code, score]) => ({ code, score: Math.round((score / (total || 1)) * 1000) / 1000 }));
  const margin = ranked.length ? (ranked[0][1] - (ranked[1]?.[1] ?? 0)) / total : 0;
  if (ranked.length && margin >= (cfg.DOMAIN_MARGIN ?? 0.2)) out.context.domain = ranked[0][0];
  for (const [intent, cues] of Object.entries(intentCues)) {
    if (cues.some(c => squash.includes(matchForm(c, rules).replace(/\s+/g, "")))) out.context.intents.push(intent);
  }
  if (out.context.intents.length) out.context.intent = out.context.intents[0];
  if (out.colorIntent.hex.length && out.context.intent === "inspiration") out.context.intent = "color_reference";

  // ---- context weighting: other disciplines x0.3 unless required/pinned
  for (const v of include.values()) {
    const d = tax.termById.get(v.id)?.domain;
    if (out.context.domain && d && d !== out.context.domain && !["sty", "mat", "mood", "sub"].includes(d) && !v.required) v.weight = Math.round(v.weight * 0.3 * 1000) / 1000;
    if (tax.termById.get(v.id)?.group === "mood.hue") out.colorIntent.hues.push(v.id);
  }
  for (const id of out.pinned) include.set(id, { id, weight: 1, required: true });
  if (out.price && out.price.amount >= (["บาท", "baht", "thb"].map(N).includes(out.price.unit) ? 1e6 : 1e7) && tax.isKnown("sty.quiet_luxury") && !include.has("sty.quiet_luxury")) {
    include.set("sty.quiet_luxury", { id: "sty.quiet_luxury", weight: out.price.soft });
  }
  out.include = [...include.values()].sort((a, b) => b.weight - a.weight);
  out.exclude = [...exclude];

  // ---- unknown words (never dropped silently): unmatched content tokens, adjacent Thai merged
  let chunk = [];
  const flush = () => {
    if (!chunk.length) return;
    const term = chunk.map(t => t.raw).join(chunk[0].thai ? "" : " ").trim();
    if (term.length >= 2) out.unknown.push({ term, lang: THAI.test(term) ? (/[a-z]/i.test(term) ? "mixed" : "th") : "en" });
    chunk = [];
  };
  tokens.forEach((t, i) => {
    const f = t.form;
    const skip = used[i] || /^[0-9.,]+$/.test(f) || /^[^\p{L}\p{N}]+$/u.test(f) || filler.has(f) || connector.has(f) || ignore.has(f) || must.has(f) || soft.has(f) || neg.has(f) ||
      CONNECT.has(f) || BUT.has(f) || VERY.has(f) || TINY.has(f);
    const flat = f.replace(/\s+/g, "");
    const inCue = flat.length >= 3 && [...cueSquash].some(c => c.includes(flat));
    if (skip || inCue) flush(); else if (chunk.length && chunk[0].thai !== t.thai) { flush(); chunk.push(t); } else chunk.push(t);
  });
  flush();

  // ---- chips (display-only: what was understood)
  const label = id => tax.label(id);
  out.chips = [
    ...out.include.map(v => ({ id: v.id, label: label(v.id), kind: v.required ? "required" : "tag", weight: v.weight })),
    ...out.exclude.map(id => ({ id, label: label(id), kind: "exclude", weight: 1 })),
    ...out.colorIntent.hex.map(h => ({ id: h, label: h, kind: "color", weight: 1 })),
    ...out.pinnedKeywords.map(k => ({ id: "#" + k, label: "#" + k, kind: "keyword", weight: 1 })),
  ];
  return out;
}

export { normalizeTerm };
