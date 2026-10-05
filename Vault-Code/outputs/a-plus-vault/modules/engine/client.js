/** Lazy browser loader for the taxonomy + parser (one fetch, shared). Resolves null when unavailable; callers fall back. */
let pending = null;

export function loadEngine() {
  if (!pending) {
    pending = fetch("/engine-data.json")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("engine data unavailable"))))
      .then(async data => {
        const [{ loadTaxonomy }, { parseQuery }] = await Promise.all([import("./taxonomy.js"), import("./parser.js")]);
        const tax = loadTaxonomy(data.taxonomy);
        return { tax, cfg: data.config, parse: q => parseQuery(q, tax, data.config) };
      })
      .catch(() => null);
  }
  return pending;
}
