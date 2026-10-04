import { createHandler } from "../vault-api-shared.mjs";
import { bangkokDateKey, rotateFeed } from "../engine/feed.mjs";
import { fetchFeedPool, publicItem } from "../engine/discover-read.mjs";

/** Discover default feed, rotated daily (variety across category/source; recently seen items go last). Published-only. */
export default createHandler({
  methods: ["GET"],
  requireToken: false,
  limit: { name: "feed", limit: 120, windowMs: 60_000 },
  fallbackStatus: 502,
  fallbackMessage: "Discover is unavailable right now.",
  async handle(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const limit = Math.max(1, Math.min(60, Number(url.searchParams.get("limit")) || 30));
    const category = (url.searchParams.get("category") || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
    const seen = (url.searchParams.get("s") || "").split(",").filter(p => /^[0-9a-f]{8}$/i.test(p)).slice(0, 120).map(p => p.toLowerCase());
    const pool = await fetchFeedPool({ category });
    const ordered = rotateFeed(pool, bangkokDateKey(), { seenPrefixes: seen });
    const page = ordered.slice(offset, offset + limit);
    // Same for everyone on a given day unless the visitor sends their own "seen" list.
    res.setHeader("Cache-Control", seen.length ? "private, max-age=60" : "public, max-age=60, s-maxage=600, stale-while-revalidate=1800");
    return { success: true, total: ordered.length, nextOffset: offset + limit < ordered.length ? offset + limit : null, items: page.map(publicItem) };
  },
});
