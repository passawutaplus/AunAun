/**
 * CDN-cached public project feeds (same rows for every visitor).
 *
 * GET /api/public-feed?kind=recent   newest published (120)
 * GET /api/public-feed?kind=top      most liked/viewed published (200)
 *
 * Uses the publishable key, so RLS applies exactly as for an anonymous browser.
 */
const FEED_SELECT =
  "id, title, subtitle, cover_url, gallery_urls, category, owner_id, likes, views, status, created_at, tools, tags, allow_hire, allow_collab, license_type, sort_order, is_pinned, opportunity_types, collab_user_ids";
const AI_SELECT = "ai_assisted, ai_disclosure_note";

const KINDS = {
  recent: { order: "created_at.desc", limit: 120 },
  top: { order: "likes.desc,views.desc", limit: 200 },
};

async function query(baseUrl, key, kind, select) {
  const params = new URLSearchParams({
    select,
    status: "eq.Published",
    order: kind.order,
    limit: String(kind.limit),
  });
  return fetch(`${baseUrl}/rest/v1/projects?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "anthem" },
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const kind = KINDS[String(req.query?.kind || "recent")];
  if (!kind) return res.status(400).json({ error: "unknown_kind" });

  const baseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!baseUrl || !key) return res.status(503).json({ error: "not_configured" });

  try {
    let upstream = await query(baseUrl, key, kind, `${FEED_SELECT}, ${AI_SELECT}`);
    if (upstream.status === 400) upstream = await query(baseUrl, key, kind, FEED_SELECT);
    if (!upstream.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({ error: "upstream", status: upstream.status });
    }
    const rows = await upstream.json();
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(rows);
  } catch (err) {
    console.error("[public-feed]", err);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "upstream" });
  }
}
