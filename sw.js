const CACHE_NAME = 'basket-manager-v8.5.104';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Never cache Supabase/API traffic.
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/storage/v1/')
  ) {
    return;
  }

  // Navigation: network first, cached app shell as fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: cache first, then network.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (resp && resp.status === 200 && resp.type !== 'opaque') {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return resp;
    }))
  );
});
