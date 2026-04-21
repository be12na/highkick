const CACHE_NAME = 'highkick-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/web/index.html',
  '/web/admin.html',
  '/web/anggota.html',
  '/web/css/style.css',
  '/web/css/admin.css',
  '/web/css/login.css',
  '/web/js/app.js',
  '/web/js/api.js',
  '/web/js/auth.js',
  '/web/js/admin.js',
  '/web/js/anggota.js',
  '/web/assets/highkick-logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Do not cache API requests using SW

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/web/index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
