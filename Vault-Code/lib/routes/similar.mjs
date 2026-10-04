import { createHandler } from "../vault-api-shared.mjs";
import { engineConfig } from "../engine/config.mjs";
import { defaultTaxonomy } from "../engine/enrich.mjs";
import { findSimilar } from "../engine/ranking.mjs";
import { fetchById, fetchSimilarCandidates, publicItem } from "../engine/discover-read.mjs";

/** "More like this" / "Opposite" for one published Discover image. No AI, published-only, cacheable. */
export default createHandler({
  methods: ["GET"],
  requireToken: false,
  limit: { name: "similar", limit: 120, windowMs: 60_000 },
  fallbackStatus: 502,
  fallbackMessage: "Similar images are unavailable right now.",
  async handle(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    const id = req.query?.id || url.pathname.split("/").filter(Boolean).pop();
    const target = await fetchById(id);
    if (!target) {
      const error = new Error("Image not found.");
      error.status = 404;
      throw error;
    }
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const seen = (url.searchParams.get("seen") || "").split(",").filter(s => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 200);
    const pool = await fetchSimilarCandidates(target);
    const result = findSimilar(target, pool, defaultTaxonomy(), engineConfig, { offset, seen, opposite: url.searchParams.get("opposite") === "1" });
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return { success: true, total: result.total, nextOffset: result.nextOffset, items: result.items.map(r => ({ ...publicItem(r.item), score: r.score })) };
  },
});
