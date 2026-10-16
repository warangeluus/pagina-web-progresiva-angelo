/* Cache API guarda la interfaz e imágenes; IndexedDB guarda películas estructuradas. */
const SHELL_CACHE = "cinehub-shell-v1";
const IMAGE_CACHE = "cinehub-images-v1";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./api.js", "./db.js", "./manifest.json", "./assets/icons/icon.svg", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => ![SHELL_CACHE, IMAGE_CACHE].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(SHELL_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || (request.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
    return;
  }

  if (url.hostname === "image.tmdb.org") {
    event.respondWith(caches.open(IMAGE_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch { return cached || Response.error(); }
    }));
    return;
  }

  if (url.hostname === "api.themoviedb.org") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(SHELL_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || Response.error())));
  }
});
