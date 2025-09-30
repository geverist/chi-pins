/* Pinboard Service Worker */
const VERSION = 'v3';
const STATIC_CACHE  = `static-${VERSION}`;  // app shell
const ASSETS_CACHE  = `assets-${VERSION}`;  // built JS/CSS/images
const TILES_CACHE   = `tiles-${VERSION}`;   // OSM tiles (stale-while-revalidate)
const RUNTIME_CACHE = `runtime-${VERSION}`;

const APP_SHELL = [
  '/',                    // SPA shell
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',  // make sure these exist
  '/icons/icon-512.png'
];

// simple helper
const sameOrigin = (url) => (new URL(url, self.location.href)).origin === self.location.origin;

// Supabase domains you should NEVER cache
const SUPABASE_HOSTS = [
  'supabase.co',       // REST
  'supabase.in',       // some regions
  'supabase.net',      // edge funcs if configured
  'supabase.com'       // auth endpoints
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(APP_SHELL);
  })());
  // Enable navigation preload for faster SPA navigations
  self.registration.navigationPreload?.enable();
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Claim immediately
    await self.clients.claim();
    // Cleanup old caches
    const keys = await caches.keys();
    const allow = new Set([STATIC_CACHE, ASSETS_CACHE, TILES_CACHE, RUNTIME_CACHE]);
    await Promise.all(keys.map(k => allow.has(k) ? null : caches.delete(k)));
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) SPA navigation: network-first with fallback to cached shell
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const preload = await e.preloadResponse;
        if (preload) return preload;
        const net = await fetch(req);
        // Cache the latest index.html for offline
        const staticCache = await caches.open(STATIC_CACHE);
        staticCache.put('/index.html', net.clone());
        return net;
      } catch {
        // Fallback to cached shell
        const staticCache = await caches.open(STATIC_CACHE);
        return (await staticCache.match('/index.html')) || (await staticCache.match('/'));
      }
    })());
    return;
  }

  // 2) Avoid caching Supabase / APIs / websockets
  const isSupabase = SUPABASE_HOSTS.some(h => url.hostname.endsWith(h));
  if (isSupabase) {
    // Always pass-through (network)
    return; // let the browser fetch normally
  }

  // 3) Vite hashed assets (same-origin /assets/...): cache-first
  if (sameOrigin(url) && url.pathname.startsWith('/assets/')) {
    e.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // 4) Leaflet / OSM tiles: stale-while-revalidate into a separate cache
  const isOSMTile =
    url.hostname.includes('tile.openstreetmap.org') ||
    url.pathname.match(/\/tiles?\//i);

  if (isOSMTile) {
    e.respondWith(staleWhileRevalidate(req, TILES_CACHE, { ignoreSearch: true }));
    return;
  }

  // 5) Other same-origin GETs: try cache-first, then network, cache if OK
  if (sameOrigin(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // 6) Cross-origin GETs (e.g., fonts/CDNs): network-first, cache if opaque/ok
  e.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    try {
      const res = await fetch(req, { mode: req.mode, credentials: req.credentials });
      // Cache opaque (no-cors) or ok responses
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});

/* ---------- strategies ---------- */
async function cacheFirst(request, cacheName, opts = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, opts);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName, opts = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, opts);
  const netPromise = fetch(request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await netPromise) || Response.error();
}
