// Service Worker - permite funcionar offline
// y mantener escaneo en background

const CACHE_NAME = 'arbitraje-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/engine.js',
  '/js/app.js',
  '/manifest.json',
];

// Instalar - cachear archivos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar - limpiar caches viejos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - servir desde cache, luego red
self.addEventListener('fetch', (e) => {
  // No cachear las APIs de exchanges
  if (e.request.url.includes('api.')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
