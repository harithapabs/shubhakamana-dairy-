/*
 * शुभकामना डेरी — Service Worker (production-ready)
 * --------------------------------------------------
 * - install: मुख्य फाइलहरू + आइकन + CDN (Tailwind/FontAwesome) प्रिक्यास (offline को लागि)
 * - activate: पुरानो cache हटाउने + नयाँ client लाई control लिने
 * - fetch:
 *     navigation  → network-first, offline मा index.html cache fallback
 *     बाँकी सबै    → stale-while-revalidate (cache बाट तुरुन्त + background मा refresh)
 */
const CACHE_NAME = 'shubhakamana-dairy-v6';
const OFFLINE_URL = './index.html';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-96.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  // CDN — offline पनि UI चल्न
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-v4compatibility.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // एउटा asset असफल भए पनि install नरोक्ने
      Promise.allSettled(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' }))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // पृष्ठ खुल्दा (navigation): network-first → offline मा cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(OFFLINE_URL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
    return;
  }

  // बाँकी सबै (local + CDN): cache बाट तुरुन्त, साथै background मा अपडेट
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
