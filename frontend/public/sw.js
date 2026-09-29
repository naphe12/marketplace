const CACHE_VERSION = "marketplace-shell-v1";
const RUNTIME_CACHE = "marketplace-runtime-v1";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/icons.svg",
  "/manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![CACHE_VERSION, RUNTIME_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isNavigation(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"));
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached ?? await fetched ?? caches.match("/index.html");
}

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (isNavigation(request)) {
    event.respondWith(networkFirst(request).catch(() => caches.match("/index.html")));
    return;
  }

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
