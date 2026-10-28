// Bike Tour Piemonte service worker: opens instantly and works offline for diary and saved rides.
// Bump VERSION on every release so old caches are dropped.
const VERSION = 'btp-2026-10-28b';
const SHELL = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app page: always try the network first so updates show up straight away
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req)
      .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return res; })
      .catch(() => caches.match('./')));
    return;
  }

  // App files and the map library: from the cache, refreshed in the background
  if(url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com'){
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if(res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
  // Everything else (routing, map tiles, fountains, place names) goes straight to the network
});
