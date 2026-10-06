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

/* Web Share Target: Android "Share > A+ Vault". Images wait in IndexedDB (nothing is uploaded) until the person confirms in the app. */
const SHARE_PATH = "/share-target";
const SHARE_DB = "aplus-vault-share";
const SHARE_STORE = "pending";
const SHARE_MAX_FILES = 10;

function putPendingShare(row) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(SHARE_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(SHARE_STORE, { keyPath: "id" });
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(SHARE_STORE, "readwrite");
      tx.objectStore(SHARE_STORE).put(row);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

async function handleShare(req) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter(f => f && typeof f === "object" && f.size > 0 && /^image\/(jpeg|png|webp)$/.test(f.type)).slice(0, SHARE_MAX_FILES);
    const title = String(form.get("title") || "").slice(0, 200);
    const text = String(form.get("text") || "").slice(0, 1000);
    let url = String(form.get("url") || "").slice(0, 1500);
    if (!url) {
      const found = text.match(/https?:\/\/\S+/);
      if (found) url = found[0].slice(0, 1500);
    }
    if (!files.length) {
      const q = new URLSearchParams();
      if (url) q.set("share_url", url);
      if (title) q.set("share_title", title);
      if (text) q.set("share_text", text);
      return Response.redirect("/vault" + (q.toString() ? "?" + q.toString() : ""), 303);
    }
    await putPendingShare({ id: (self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : String(Date.now()) + Math.random()), at: Date.now(), files, title, text, url });
    return Response.redirect("/vault?share=pending", 303);
  } catch (error) {
    return Response.redirect("/vault", 303);
  }
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method === "POST") {
    const postUrl = new URL(req.url);
    if (postUrl.origin === self.location.origin && postUrl.pathname === SHARE_PATH) event.respondWith(handleShare(req));
    return;
  }
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
