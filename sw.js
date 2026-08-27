/* Basket Manager v8.9 · PWA Offline Resiliente */
const VERSION = 'basket-manager-v8.9-pwa-07-login-icons';
const APP_CACHE = VERSION + '-app';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('basket-manager-') && k !== APP_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache/intercept Supabase or other remote API traffic.
  if (url.hostname.endsWith('.supabase.co') || url.pathname.includes('/rest/v1/') ||
      url.pathname.includes('/auth/v1/') || url.pathname.includes('/storage/v1/')) {
    return;
  }

  // Navigation: network first; if hosting is unavailable, boot cached index.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(APP_CACHE).then(cache => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin static assets: cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }))
    );
  }
  // Cross-origin resources (Google Fonts / CDN Chart.js) stay network-only in this first validated build.
});
