import { createHandler } from "../lib/vault-api-shared.mjs";
import { engineConfig } from "../lib/engine/config.mjs";
import { defaultTaxonomy } from "../lib/engine/enrich.mjs";
import { parseQuery } from "../lib/engine/parser.mjs";
import { rankItems } from "../lib/engine/ranking.mjs";
import { fetchCandidates, publicItem, rpcQuiet } from "../lib/engine/discover-read.mjs";

const MAX_QUERY = 600;

/** Discover search: parse (no AI) -> candidates via the GIN index -> rank in code. Published-only, cacheable, read-only. */
export default createHandler({
  methods: ["GET"],
  requireToken: false,
  limit: { name: "search", limit: 120, windowMs: 60_000 },
  fallbackStatus: 502,
  fallbackMessage: "Search is unavailable right now.",
  async handle(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    const q = (url.searchParams.get("q") || "").slice(0, MAX_QUERY);
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const limit = Math.max(1, Math.min(60, Number(url.searchParams.get("limit")) || 30));
    const tax = defaultTaxonomy();
    const parsed = parseQuery(q, tax, engineConfig);
    const chips = parsed.chips;
    if (!parsed.include.length && !parsed.colorIntent.hex.length && !parsed.pinnedKeywords.length) {
      res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60");
      return { success: true, chips, context: parsed.context, items: [], total: 0, nextOffset: null };
    }
    const candidates = await fetchCandidates(parsed);
    const ranked = rankItems(parsed, candidates, tax, engineConfig, { limit, offset });
    if (engineConfig.LEARN_CAPTURE && parsed.unknown.length && offset === 0) await rpcQuiet("log_unknown_terms", { p_terms: parsed.unknown.slice(0, 8) });
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    return {
      success: true,
      chips,
      context: parsed.context,
      total: ranked.total,
      nextOffset: ranked.nextOffset,
      items: ranked.items.map(r => ({ ...publicItem(r.item), score: r.score, matchedTags: r.matchedTags, missingTags: r.missingTags })),
    };
  },
});
