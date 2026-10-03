/* A+ Vault service worker: installable app + offline shell + faster repeat loads.
   BUILD is stamped by build.mjs so every deploy gets its own caches.
   Only same-origin static files are cached. API calls, Supabase, auth tokens and
   cross-origin images never pass through the cache. */
const BUILD = "dev";
const STATIC = `vault-static-${BUILD}`;
const PAGES = `vault-pages-${BUILD}`;
const OFFLINE_URL = "/offline"; // clean URL: /offline.html 308-redirects, and a redirected response cannot answer a navigation
const SHELL_KEY = "/__shell";
const PRECACHE = [OFFLINE_URL, "/assets/icon-192.png"];
const SPA_ROUTE = /^\/(vault|discover|moodboards)(\/|$)/;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("vault-") && k !== STATIC && k !== PAGES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheable = res => res && res.ok && res.type === "basic" && !res.redirected && !/no-store/i.test(res.headers.get("cache-control") || "");

async function networkFirst(req, cacheName, key = req) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (cacheable(res)) cache.put(key, res.clone());
    return res;
  } catch (error) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw error;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) cache.put(req, res.clone());
  return res;
}

async function navigate(req, url) {
  const spa = SPA_ROUTE.test(url.pathname);
  try {
    return await networkFirst(req, PAGES, spa ? SHELL_KEY : url.pathname);
  } catch (error) {
    const cache = await caches.open(PAGES);
    return (await cache.match(spa ? SHELL_KEY : url.pathname)) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("authorization") || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.well-known/") || url.pathname === "/sw.js") return;
  if (req.mode === "navigate") {
    event.respondWith(navigate(req, url));
  } else if (/^\/assets\/.+\.(png|webp|jpe?g|svg|woff2)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  } else if (/\.(js|css|webmanifest)$/.test(url.pathname)) {
    event.respondWith(networkFirst(req, STATIC));
  }
});
