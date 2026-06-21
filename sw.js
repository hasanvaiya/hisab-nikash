const CACHE_NAME = 'hisab-nikash-v3';
const ASSETS = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'app_icon_1782042361104.png'
];

// Install Service Worker and cache all essential static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PWA Offline Cache opened successfully.');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clear old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removing old PWA cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-First strategy: Intercept network fetch requests and serve cache if found
self.addEventListener('fetch', (event) => {
  // Only intercept HTTP/HTTPS GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Serve from cache
        }
        
        // Fallback to fetch from network
        return fetch(event.request).then((networkResponse) => {
          // If request succeeds and is part of our assets, update the cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback logic (e.g. if request is HTML page, serve cached index.html)
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('index.html');
          }
        });
      })
  );
});
