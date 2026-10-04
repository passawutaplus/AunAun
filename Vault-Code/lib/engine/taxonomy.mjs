/**
 * Pure ESM taxonomy builder + loader (shared by api/, the seeder and the browser).
 * buildTaxonomy(dictionary, engineConfig) -> taxonomy object (JSON-serialisable)
 * loadTaxonomy(json)                      -> { ...taxonomy, termById, groupById, lookup(text), label(id), isKnown(id) }
 */

/** Lowercase + NFC + collapse spaces. Fuzzy/Thai-tone matching is the parser's job (phase 06). */
export function normalizeTerm(text) {
  return String(text || "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildTaxonomy(dictionary, config) {
  const groups = [];
  const terms = [];
  const synonyms = {}; // normalized text -> term id (first writer wins; collisions reported by validate)
  const domains = [];
  for (const dom of dictionary.domains) {
    domains.push({ code: dom.code, th: dom.th, en: dom.en });
    for (const g of dom.groups) {
      groups.push({ id: g.id, domain: dom.code, th: g.th, en: g.en, maxPerImage: g.maxPerImage ?? null, layer: config.group_layers?.[g.id] || "C" });
      for (const t of g.terms) {
        terms.push({ id: t.id, group: g.id, domain: dom.code, th: t.th || [], en: t.en || [], parent: t.parent || null });
        for (const s of [...(t.th || []), ...(t.en || [])]) {
          const key = normalizeTerm(s);
          if (key && !(key in synonyms)) synonyms[key] = t.id;
        }
      }
    }
  }
  const phrases = (config.phrases || []).map(p => ({ match: p.match.map(normalizeTerm), tags: p.tags }));
  return {
    version: 1,
    domains,
    groups,
    terms,
    synonyms,
    phrases,
    words: {
      must: config.must_words || [], soft: config.soft_words || [], negation: config.negation_words || [],
      ignore: config.ignore_words || [], connector: config.connector_words || [], filler: config.filler_words || [],
    },
    domainCues: config.domain_cues || {},
    intentCues: config.intent_cues || {},
    languageRules: config.language_rules || {},
  };
}

/** Returns a list of problems; empty means valid. */
export function validateTaxonomy(tax) {
  const errors = [];
  const ids = new Set();
  const groupIds = new Set();
  for (const g of tax.groups || []) {
    if (groupIds.has(g.id)) errors.push(`duplicate group id ${g.id}`);
    groupIds.add(g.id);
  }
  for (const t of tax.terms || []) {
    if (!/^[a-z0-9_.]+$/.test(t.id)) errors.push(`bad term id ${t.id}`);
    if (ids.has(t.id)) errors.push(`duplicate term id ${t.id}`);
    ids.add(t.id);
    if (!groupIds.has(t.group)) errors.push(`term ${t.id} has unknown group ${t.group}`);
    if (!t.th.length && !t.en.length) errors.push(`term ${t.id} has no labels`);
  }
  const parentOf = new Map((tax.terms || []).map(t => [t.id, t.parent]));
  for (const [id, parent] of parentOf) {
    if (parent && !ids.has(parent)) errors.push(`term ${id} has unknown parent ${parent}`);
    const seen = new Set([id]);
    for (let p = parent; p; p = parentOf.get(p)) {
      if (seen.has(p)) { errors.push(`parent cycle at ${id}`); break; }
      seen.add(p);
    }
  }
  for (const [text, id] of Object.entries(tax.synonyms || {})) if (!ids.has(id)) errors.push(`synonym "${text}" points to unknown id ${id}`);
  for (const p of tax.phrases || []) for (const [id] of p.tags) if (!ids.has(id)) errors.push(`phrase ${p.match[0]} uses unknown id ${id}`);
  for (const key of Object.keys(tax.domainCues || {})) if (!(tax.domains || []).some(d => d.code === key)) errors.push(`domain cue for unknown domain ${key}`);
  return errors;
}

export function loadTaxonomy(json) {
  const errors = validateTaxonomy(json);
  if (errors.length) throw new Error(`taxonomy invalid: ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? ` (+${errors.length - 5} more)` : ""}`);
  const termById = new Map(json.terms.map(t => [t.id, t]));
  const groupById = new Map(json.groups.map(g => [g.id, g]));
  return {
    ...json,
    termById,
    groupById,
    isKnown: id => termById.has(id),
    /** Synonym text (th or en) -> term id, or null. */
    lookup: text => json.synonyms[normalizeTerm(text)] || null,
    /** UI label = th[0], fallback en[0], fallback id. */
    label: id => { const t = termById.get(id); return t ? t.th[0] || t.en[0] || id : id; },
    /** Drops tags whose ids are not in the taxonomy (tagger output with unknown ids is rejected). */
    filterKnownTags: tags => (tags || []).filter(tag => termById.has(tag?.id)),
  };
}
