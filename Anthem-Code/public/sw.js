const CACHE_VERSION = "aplus1-shell-v4";
/** Images shared from the Android share sheet, waiting for /portfolio/new to pick them up. */
const SHARE_CACHE = "samecor-share-target";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION && key !== SHARE_CACHE).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

async function receiveShare(request) {
  const form = await request.formData();
  const files = form.getAll("media").filter((item) => item && typeof item === "object" && "type" in item);
  await caches.delete(SHARE_CACHE);
  const cache = await caches.open(SHARE_CACHE);
  await Promise.all(
    files.map((file, index) =>
      cache.put(
        `/shared-media/${index}`,
        new Response(file, {
          headers: { "content-type": file.type, "x-file-name": encodeURIComponent(file.name || `shared-${index}`) },
        }),
      ),
    ),
  );
  return Response.redirect(files.length ? "/portfolio/new?shared=1" : "/portfolio/new", 303);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Android share sheet → manifest share_target posts the images here.
  if (request.method === "POST" && new URL(request.url).pathname === "/share-target") {
    event.respondWith(receiveShare(request).catch(() => Response.redirect("/portfolio/new", 303)));
    return;
  }
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("supabase")) return;

  // Vite hashed bundles must never be cache-first — old shell → deleted chunk = 404.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (["style", "script", "font", "image"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

// Push from the send-push edge function (Solo-Code/supabase/functions/send-push).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SAMECOR", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "SAMECOR";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/notification-badge.png",
      image: data.image,
      tag: data.tag,
      renotify: Boolean(data.tag && data.renotify),
      actions: Array.isArray(data.actions)
        ? data.actions.slice(0, 2).map((a) => ({ action: a.action, title: a.title }))
        : [],
      vibrate: [12, 60, 12],
      timestamp: Date.now(),
      data: {
        url: data.url || "/notifications",
        // Buttons with their own destination (ดูโปรไฟล์, ปิดแจ้งเตือนแนะนำ…).
        actionUrls: Object.fromEntries(
          (Array.isArray(data.actions) ? data.actions : []).filter((a) => a.url).map((a) => [a.action, a.url]),
        ),
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const href = (event.action && data.actionUrls && data.actionUrls[event.action]) || data.url || "/notifications";
  const target = new URL(href, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const open = clientList.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        return open.focus().then((client) => (client && "navigate" in client ? client.navigate(target.href) : null));
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
