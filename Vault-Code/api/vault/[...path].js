// ONE Vercel function for every route in this group (the Hobby plan allows 12 functions per deployment).
// The route handlers live in lib/routes/*.mjs and keep their own methods, auth, rate limits and CORS.
export const config = { maxDuration: 60, api: { bodyParser: false } };

const ROUTES = {
  "capture": "vault-capture",
  "capture-batch": "vault-capture-batch",
  "capture-file": "vault-capture-file",
  "captures": "vault-captures",
  "captures-id": "vault-captures-id",
  "collections": "vault-collections",
  "enrich": "vault-enrich",
  "health": "vault-health",
  "preview": "vault-preview",
  "token": "vault-token",
  "__prefix": {
    "captures/": "vault-captures-id"
  }
};

const LOADERS = {
  "vault-capture": () => import("../../lib/routes/vault-capture.mjs"),
  "vault-capture-batch": () => import("../../lib/routes/vault-capture-batch.mjs"),
  "vault-capture-file": () => import("../../lib/routes/vault-capture-file.mjs"),
  "vault-captures": () => import("../../lib/routes/vault-captures.mjs"),
  "vault-captures-id": () => import("../../lib/routes/vault-captures-id.mjs"),
  "vault-collections": () => import("../../lib/routes/vault-collections.mjs"),
  "vault-enrich": () => import("../../lib/routes/vault-enrich.mjs"),
  "vault-health": () => import("../../lib/routes/vault-health.mjs"),
  "vault-preview": () => import("../../lib/routes/vault-preview.mjs"),
  "vault-token": () => import("../../lib/routes/vault-token.mjs"),
};

const cache = new Map();
async function load(file) {
  if (!cache.has(file)) cache.set(file, LOADERS[file]().then(m => m.default));
  return cache.get(file);
}

function routeOf(req) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "");
  const parts = pathname.split("/").filter(Boolean).slice(2); // drop "api" (and "vault")
  const key = parts.join("/");
  if (ROUTES[key]) return ROUTES[key];
  for (const [prefix, file] of Object.entries(ROUTES.__prefix || {})) if (key.startsWith(prefix)) return file;
  return null;
}

export default async function handler(req, res) {
  const file = routeOf(req);
  if (!file) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ success: false, message: "Not found." }));
    return;
  }
  if (file === "similar" || file === "vault-captures-id") {
    const u = new URL(req.url, "http://localhost"), id = u.searchParams.get("id") || decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    req.query = { ...(req.query || {}), id };
  }
  return (await load(file))(req, res);
}
