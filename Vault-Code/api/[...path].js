// ONE Vercel function for every route in this group (the Hobby plan allows 12 functions per deployment).
// The route handlers live in lib/routes/*.mjs and keep their own methods, auth, rate limits and CORS.
export const config = { maxDuration: 60 };

const ROUTES = {
  "account/delete": "account-delete",
  "account/export": "account-export",
  "account-delete": "account-delete",
  "account-export": "account-export",
  "similar": "similar",
  "discover": "discover",
  "feed": "feed",
  "import-url": "import-url",
  "privacy-request": "privacy-request",
  "search": "search",
  "signal": "signal",
  "unsubscribe": "unsubscribe",
  "__prefix": {
    "similar/": "similar"
  }
};

const LOADERS = {
  "account-delete": () => import("../lib/routes/account-delete.mjs"),
  "account-export": () => import("../lib/routes/account-export.mjs"),
  "discover": () => import("../lib/routes/discover.mjs"),
  "feed": () => import("../lib/routes/feed.mjs"),
  "import-url": () => import("../lib/routes/import-url.mjs"),
  "privacy-request": () => import("../lib/routes/privacy-request.mjs"),
  "search": () => import("../lib/routes/search.mjs"),
  "signal": () => import("../lib/routes/signal.mjs"),
  "similar": () => import("../lib/routes/similar.mjs"),
  "unsubscribe": () => import("../lib/routes/unsubscribe.mjs"),
};

const cache = new Map();
async function load(file) {
  if (!cache.has(file)) cache.set(file, LOADERS[file]().then(m => m.default));
  return cache.get(file);
}

function routeOf(req) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "");
  const parts = pathname.split("/").filter(Boolean).slice(1); // drop "api" (and "vault")
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
