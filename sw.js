const CACHE_PREFIX = "nanokvm-usb-cache";
const CACHE_VERSION = "1.0.3.5";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./sipeed.ico",
  "./manifest.webmanifest",
  "./assets/index-BCxmGuRY.css",
  "./assets/index-hgLD4H0A.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

const cachePromise = caches.open(CACHE_NAME);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await cachePromise;
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // For navigations, go network-first and fall back to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(networkFirstForPage(request));
    return;
  }

  // For other requests (JS, CSS, images), use stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, event));
});

async function networkFirstForPage(request) {
  const cache = await cachePromise;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
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

async function staleWhileRevalidate(request, event) {
  const cache = await cachePromise;
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  if (cached) {
    event.waitUntil(fetchPromise.catch(() => undefined));
    return cached;
  }

  return fetchPromise;
}
