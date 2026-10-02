import { createHandler } from "../lib/vault-api-shared.mjs";
import { publishableKey, supabaseUrl } from "../lib/supabase-rest.mjs";

const ALLOWED_PARAMS = new Set(["select", "category", "and", "order", "limit", "id"]);
const ALLOWED_COLUMNS = new Set([
  "id", "source", "source_url", "title", "license", "license_url", "attribution", "attribution_json",
  "image_sm_path", "image_md_path", "image_lg_path", "blurhash", "width", "height", "phash",
  "category", "tags", "style", "colors", "source_meta", "published_at",
]);
const MAX_LIMIT = 300;

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

/** Rebuilds the PostgREST query from an allowlist; always published-only, bounded size. */
export function discoverUpstreamQuery(search) {
  const incoming = new URLSearchParams(search);
  const params = new URLSearchParams();
  for (const [key, value] of incoming) {
    if (!ALLOWED_PARAMS.has(key) || value.length > 2000) continue;
    params.set(key, value);
  }
  const columns = (params.get("select") || "").split(",").filter(Boolean);
  if (!columns.length || columns.some(col => !ALLOWED_COLUMNS.has(col))) throw badRequest("Unsupported Discover columns.");
  params.set("status", "eq.published");
  params.set("limit", String(Math.max(1, Math.min(MAX_LIMIT, Number(params.get("limit")) || 30))));
  if (!params.get("order")) params.set("order", "published_at.desc,id.desc");
  return params.toString();
}

// Public, identical for every visitor: let the Vercel CDN answer repeats instead of Postgres.
export default createHandler({
  methods: ["GET"],
  requireToken: false,
  limit: { name: "discover", limit: 240, windowMs: 60_000 },
  fallbackStatus: 502,
  fallbackMessage: "Discover is unavailable right now.",
  async handle(req, res) {
    const query = discoverUpstreamQuery(new URL(req.url || "/", "http://localhost").search);
    const key = publishableKey();
    const upstream = await fetch(`${supabaseUrl()}/rest/v1/discover_items?${query}`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
    });
    const rows = await upstream.json().catch(() => null);
    if (!upstream.ok) throw badRequest(rows?.message || "Discover query failed.");
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=600");
    return Array.isArray(rows) ? rows : [];
  }
});
