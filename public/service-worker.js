const CACHE_NAME = 'chi-pins-v1';
const RUNTIME_CACHE = 'chi-pins-runtime-v1';
const MAP_TILES_CACHE = 'chi-pins-map-tiles-v1';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== MAP_TILES_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Map tiles - cache first, long TTL, aggressive caching
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tiles.stadiamaps.com') ||
      url.hostname.includes('tile.opentopomap.org')) {
    event.respondWith(
      caches.open(MAP_TILES_CACHE).then(cache => {
        return cache.match(request).then(response => {
          // Serve from cache immediately if available
          if (response) {
            return response;
          }

          // Fetch from network with optimizations
          return fetch(request, {
            // Performance hints
            cache: 'force-cache',  // Use browser cache aggressively
            priority: 'low',  // Lower priority for tiles
          }).then(networkResponse => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              // Clone response before caching
              const responseToCache = networkResponse.clone();

              // Cache in background (non-blocking)
              cache.put(request, responseToCache).catch(err => {
                console.warn('[Service Worker] Failed to cache tile:', err);
              });
            }
            return networkResponse;
          }).catch(() => {
            // Return a blank transparent tile if offline
            return new Response(
              atob('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='),
              {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'image/gif' }
              }
            );
          });
        });
      })
    );
    return;
  }

  // API calls - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return empty response if no cache
            return new Response('{"error":"Offline"}', {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // App shell and assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(networkResponse => {
          // Cache new assets
          if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and no cache, return minimal response
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 404 });
        });
      })
  );
});

// Message handler for cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        return self.clients.claim();
      })
    );
  }
});
