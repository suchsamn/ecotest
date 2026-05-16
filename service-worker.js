// ===== LÚMEN SERVICE WORKER =====
const CACHE_NAME = 'lumen-v1';

// Ficheiros essenciais para funcionar offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Fontes Google (serão cacheadas na primeira visita)
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap',
];

// ===== INSTALL: cache dos ficheiros essenciais =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ===== ACTIVATE: limpar caches antigos =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ===== FETCH: Cache First para assets, Network First para Firebase =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase e APIs externas: sempre vai à rede
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('spotify.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se falhar, tenta cache como fallback
        return caches.match(event.request);
      })
    );
    return;
  }

  // Ficheiros locais: Cache First (rápido, funciona offline)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Não está em cache: vai à rede e guarda
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
