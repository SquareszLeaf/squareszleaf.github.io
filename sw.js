const CACHE_NAME = "nanokvm-usb-cache";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./sipeed.ico",
  "./manifest.webmanifest",
  "./assets/index-BCxmGuRY.css",
  "./assets/index-BqkmQfNV.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  // For navigations, go network-first and fall back to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(networkFirstForPage(request));
    return;
  }

  // For other requests (JS, CSS, images), use cache-first
  event.respondWith(cacheFirst(request));
});

async function networkFirstForPage(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached =
      (await cache.match(request)) ||
      (await cache.match("./index.html")) ||
      (await cache.match("./"));
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}
