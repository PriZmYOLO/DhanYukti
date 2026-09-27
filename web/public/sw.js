// Minimal service worker: caches the app shell and static assets only.
// Never caches /api responses (financial data stays network-only).
const CACHE = "dhanyukti-shell-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/icon.svg"]))); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api")) return;
  if (url.pathname.startsWith("/_next/static") || url.pathname.endsWith(".svg")) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res;
    })));
  }
});
