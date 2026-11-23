// Offline support · version 2 · 2026-11-22
// Only the entry page and the encrypted app are kept; app.enc can't be read without a phone that logged in.
const CACHE = 'shopapp-secure-v2';
const CORE = ['./', './index.html', './config.js', './app.enc', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const fromCache = r => { const h = new Headers(r.headers); h.set('X-From-Cache', '1'); return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h }); };
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (u.pathname.includes('/download/')) return; // the APK file is not kept offline
    // Network first (so new versions show up), saved copy when offline.
    const key = u.origin + u.pathname;
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(key, cp)); } return r; })
      .catch(() => caches.match(key).then(r => r ? fromCache(r) : (req.mode === 'navigate' ? caches.match(u.origin + u.pathname.replace(/[^/]*$/, '') + 'index.html').then(x => x || caches.match(u.origin + u.pathname.replace(/[^/]*$/, ''))) : Response.error()))));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdnjs\.cloudflare\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
