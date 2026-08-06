const CACHE_NAME = "nexora-shell-v3";
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/nexora-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }

  // Cache only successful, same-origin static assets. API and authentication
  // responses must never be persisted by the service worker.
  if (!["style", "script", "image", "font", "manifest"].includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      const networkResponse = await fetch(request);
      if (networkResponse.ok && networkResponse.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = typeof payload.title === "string" ? payload.title : "NEXORA";
  const requestedUrl = typeof payload.url === "string" ? payload.url : "/dashboard";
  const target = new URL(requestedUrl, self.location.origin);
  const safeUrl =
    target.origin === self.location.origin ? target.href : `${self.location.origin}/dashboard`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === "string" ? payload.body : "You have a new update.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: safeUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const candidate = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  const targetUrl =
    candidate.origin === self.location.origin
      ? candidate.href
      : `${self.location.origin}/dashboard`;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          if ("navigate" in client) await client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    }),
  );
});
