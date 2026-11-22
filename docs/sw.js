const CACHE = 'heims-shell-v12-qr-stock-movement';
const SHELL = ['./', './index.html', './manifest.webmanifest', './css/style.css?v=16',
  './js/config.js?v=10', './js/api.js?v=12', './js/pwa.js?v=1', './js/forms.js?v=14', './js/pages.js?v=11',
  './js/admin.js?v=12', './js/qr.js?v=8', './js/app.js?v=15', './pwa-192.png', './pwa-512.png',
  './logo.png', './logo-dark.png', './heims.png', './heims-dark.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // HTML stays network-first so deployments and app updates are picked up promptly.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === new URL('./', self.location).pathname) {
    event.respondWith(fetch(req).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('./index.html', copy)); return response;
    }).catch(() => caches.match('./index.html').then(response => response || caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(req, copy)); }
    return response;
  })));
});
