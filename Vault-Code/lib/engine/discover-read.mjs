/** Read path for Discover search/similar: anon key, published-only (RLS + status filter), allowlisted columns, bounded. */
import { publishableKey, supabaseUrl, serviceRoleKey } from "../supabase-rest.mjs";

const PUBLIC_COLUMNS = [
  "id", "source", "source_url", "title", "phash", "source_meta", "license", "license_url", "attribution", "attribution_json",
  "image_sm_path", "image_md_path", "image_lg_path", "blurhash", "width", "height", "category", "tags", "style", "colors",
  "tags_ids", "tags_json", "palette", "alt_text_th", "alt_text_en", "era", "published_at",
  "quality_score", // ranking only; stripped before the response
];

const arrayLiteral = ids => `{${ids.map(id => `"${String(id).replace(/["\\]/g, "")}"`).join(",")}}`;

async function get(query, fetchImpl = fetch) {
  const key = publishableKey();
  const res = await fetchImpl(`${supabaseUrl()}/rest/v1/discover_items?${query}`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
  });
  const rows = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error("Discover search is unavailable right now.");
    error.status = 502;
    throw error;
  }
  return Array.isArray(rows) ? rows : [];
}

function baseParams(limit) {
  return new URLSearchParams({ select: PUBLIC_COLUMNS.join(","), status: "eq.published", limit: String(limit), order: "published_at.desc,id.desc" });
}

/** Candidate pool for a parsed query: tag overlap through the GIN index, otherwise the newest published items. */
export async function fetchCandidates(parsed, { limit = 300, fetchImpl } = {}) {
  const params = baseParams(limit);
  const ids = parsed.include.map(t => t.id);
  if (ids.length) params.set("tags_ids", `ov.${arrayLiteral(ids)}`);
  if (parsed.pinnedKeywords.length) params.set("tags", `cs.${arrayLiteral(parsed.pinnedKeywords)}`);
  return get(params.toString(), fetchImpl);
}

export async function fetchById(id, { fetchImpl } = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  const params = baseParams(1);
  params.set("id", `eq.${id}`);
  return (await get(params.toString(), fetchImpl))[0] || null;
}

export async function fetchSimilarCandidates(target, { limit = 300, fetchImpl } = {}) {
  const params = baseParams(limit);
  const tags = (target.tags_ids || []).slice(0, 24);
  if (tags.length) params.set("tags_ids", `ov.${arrayLiteral(tags)}`);
  return get(params.toString(), fetchImpl);
}

/** Pool for the daily feed rotation: newest published items (bounded), optionally one category. */
export async function fetchFeedPool({ category = "", limit = 600, fetchImpl } = {}) {
  const params = baseParams(limit);
  if (category && category !== "all") params.set("category", `eq.${category}`);
  return get(params.toString(), fetchImpl);
}

/** Per-item behaviour counts (phase 10). Empty map on any problem, so ranking silently falls back to phase-06 results. */
export async function fetchBehavior({ fetchImpl = fetch } = {}) {
  try {
    const key = serviceRoleKey();
    if (!key) return new Map();
    const res = await fetchImpl(`${supabaseUrl()}/rest/v1/rpc/item_behavior`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ p_days: 180 }) });
    const rows = res.ok ? await res.json() : [];
    return new Map(rows.map(r => [r.item_id, { impressions: r.impressions, saves: r.saves, opens: r.opens, last_at: r.last_at }]));
  } catch {
    return new Map();
  }
}

/** Response shape: never leaks ranking-only fields. */
export function publicItem(item) {
  const { quality_score, tags_json, ...rest } = item;
  return rest;
}

/** Fire-and-forget RPC with the service role (aggregate unknown words / signals). Never throws. */
export async function rpcQuiet(name, body, { fetchImpl = fetch } = {}) {
  try {
    const key = serviceRoleKey();
    if (!key) return;
    await fetchImpl(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* logging must never break a search */
  }
}
