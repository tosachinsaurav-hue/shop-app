// Offline support. Only encrypted files are kept: the app itself (app.enc) cannot be read without a valid login.
const CACHE = 'shopapp-secure-v1';
const CORE = ['./', './index.html', './app.enc', './users.json', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
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
    // Network first (so new users, removed users and new versions show up), saved copy when offline.
    const key = u.origin + u.pathname;
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(key, cp)); } return r; })
      .catch(() => caches.match(key).then(r => r ? fromCache(r) : (req.mode === 'navigate' ? caches.match(u.origin + u.pathname.replace(/[^/]*$/, '') + 'index.html').then(x => x || caches.match(u.origin + u.pathname.replace(/[^/]*$/, ''))) : Response.error()))));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdnjs\.cloudflare\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
