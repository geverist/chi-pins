# Converting Chi-Pins to Progressive Web App (PWA)

## What is a PWA?

A Progressive Web App makes your web app feel like a native app:
- Install to home screen
- Offline support with service workers
- Faster loading with caching
- App-like experience (no browser UI)
- Works on any device (Android, iOS, desktop)

## Why PWA vs Native App?

### PWA Pros:
- ✅ **Quick to implement** (1-2 days vs 5 days for native)
- ✅ **Works everywhere** (Android, iOS, desktop)
- ✅ **No app store** needed
- ✅ **Automatic updates** (just refresh)
- ✅ **Same codebase** as web version
- ✅ **Much smaller** than native app

### PWA Cons:
- ❌ Less control over system features
- ❌ iOS has limited PWA support
- ❌ Can't truly "lock down" device for kiosk
- ❌ Still uses browser engine (some lag remains)

## Implementation Steps

### 1. Update manifest.json

You already have this file. Update it:

```json
{
  "name": "Chi-Pins Interactive Kiosk",
  "short_name": "Chi-Pins",
  "description": "Interactive Chicago map kiosk with games, jukebox, and local spots",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#1a1f26",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["entertainment", "food"],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "prefer_related_applications": false
}
```

### 2. Create Service Worker

Create `public/service-worker.js`:

```javascript
const CACHE_NAME = 'chi-pins-v1';
const RUNTIME_CACHE = 'chi-pins-runtime-v1';
const MAP_TILES_CACHE = 'chi-pins-map-tiles-v1';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== MAP_TILES_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
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

  // Map tiles - cache first, long TTL
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tiles.stadiamaps.com')) {
    event.respondWith(
      caches.open(MAP_TILES_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(networkResponse => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
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
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // App shell and assets - cache first
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(networkResponse => {
          // Cache new assets
          if (request.method === 'GET' && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
  );
});

// Background sync for offline pin submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pins') {
    event.waitUntil(syncPins());
  }
});

async function syncPins() {
  // Get pending pins from IndexedDB
  const db = await openDB();
  const pins = await db.getAll('pending-pins');

  for (const pin of pins) {
    try {
      await fetch('/api/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pin)
      });
      await db.delete('pending-pins', pin.id);
    } catch (error) {
      console.error('Failed to sync pin:', error);
    }
  }
}

// Helper for IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chi-pins-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-pins')) {
        db.createObjectStore('pending-pins', { keyPath: 'id' });
      }
    };
  });
}
```

### 3. Register Service Worker

Create `src/registerServiceWorker.js`:

```javascript
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('[PWA] Service Worker registered:', registration.scope);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 3600000);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('[PWA] New version available! Reload to update.');

                // Auto-reload after idle (for kiosk)
                setTimeout(() => {
                  window.location.reload();
                }, 60000); // Reload after 1 minute of idle
              }
            });
          });
        })
        .catch(error => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

// Add to window for install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Install prompt available');
  e.preventDefault();
  deferredPrompt = e;
});

export function showInstallPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install');
      }
      deferredPrompt = null;
    });
  }
}
```

### 4. Update main.jsx

Import and register the service worker:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register PWA service worker
registerServiceWorker()
```

### 5. Create App Icons

You need PWA icons. Use an online tool or create them:

```bash
# Create icons directory
mkdir -p public/icons

# You can use this online tool:
# https://realfavicongenerator.net/
# Or use ImageMagick if installed:

# If you have a logo.png (512x512 or larger):
convert public/logo.png -resize 72x72 public/icons/icon-72x72.png
convert public/logo.png -resize 96x96 public/icons/icon-96x96.png
convert public/logo.png -resize 128x128 public/icons/icon-128x128.png
convert public/logo.png -resize 144x144 public/icons/icon-144x144.png
convert public/logo.png -resize 152x152 public/icons/icon-152x152.png
convert public/logo.png -resize 192x192 public/icons/icon-192x192.png
convert public/logo.png -resize 384x384 public/icons/icon-384x384.png
convert public/logo.png -resize 512x512 public/icons/icon-512x512.png
```

### 6. Update vite.config.js

Ensure service worker is copied:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      }
    }
  },
  publicDir: 'public',
})
```

### 7. Add Offline Detection UI

Create `src/components/OfflineIndicator.jsx` (you may already have this):

```javascript
import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#f59e0b',
      color: 'white',
      padding: '12px',
      textAlign: 'center',
      zIndex: 10001,
      fontWeight: 600
    }}>
      📡 Working offline - Changes will sync when connection is restored
    </div>
  );
}
```

### 8. Deploy and Test

```bash
# Build
npm run build

# Deploy to Vercel (already set up)
npx vercel --prod

# Test PWA
# Visit https://chi-pins.vercel.app
# Open DevTools → Application → Manifest
# Check for install prompt
```

## Installing PWA on Android Tablet

### Method 1: Chrome Install Prompt
1. Open https://chicagomikes.us in Chrome
2. Tap menu (3 dots) → "Install app" or "Add to Home Screen"
3. Accept the install prompt
4. App icon appears on home screen
5. Opens in fullscreen mode (no browser UI)

### Method 2: Fully Kiosk Browser
1. Open https://chicagomikes.us in Fully Kiosk
2. Settings → "Advanced Web Settings"
3. Enable "Desktop Mode" (helps with install)
4. Or use Chrome to install, then configure Fully Kiosk to open the installed PWA

### Method 3: Samsung Internet Browser
1. Open URL in Samsung Internet
2. Menu → "Add page to" → "Home screen"
3. Select "App" instead of bookmark

## Performance Optimization

### Preload Critical Resources

In `index.html`:

```html
<head>
  <!-- Preload critical assets -->
  <link rel="preload" href="/assets/logo.png" as="image">
  <link rel="preconnect" href="https://tile.openstreetmap.org">
  <link rel="dns-prefetch" href="https://tile.openstreetmap.org">
</head>
```

### Lazy Load Components

Update App.jsx to lazy load heavy components:

```javascript
import { lazy, Suspense } from 'react';

const GamesMenu = lazy(() => import('./components/GamesMenu'));
const Jukebox = lazy(() => import('./components/Jukebox'));
const PhotoBooth = lazy(() => import('./components/PhotoBooth'));

// Then wrap in Suspense:
<Suspense fallback={<div>Loading...</div>}>
  {gamesOpen && <GamesMenu onClose={() => setGamesOpen(false)} />}
</Suspense>
```

## Testing PWA

### Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://chicagomikes.us --view

# Check PWA score (should be 100)
```

### Chrome DevTools

1. Open https://chicagomikes.us
2. F12 → Application tab
3. Check:
   - Manifest loads correctly
   - Service Worker registered
   - Cache Storage has assets
   - "Add to Home Screen" works

### Test Offline

1. Chrome DevTools → Network tab
2. Select "Offline" throttling
3. Reload page - should still work
4. Try placing a pin - should queue for sync

## Updates and Versioning

When you deploy a new version:

```javascript
// Update CACHE_NAME in service-worker.js
const CACHE_NAME = 'chi-pins-v2'; // Increment version

// Service worker will auto-update
// Users get new version on next visit
```

## Comparison: PWA vs Native App

| Feature | PWA | Native App |
|---------|-----|------------|
| **Performance** | Good (80% of native) | Excellent (100%) |
| **Offline** | ✅ Full offline support | ✅ Full offline support |
| **Installation** | ✅ One tap install | ❌ APK sideload needed |
| **Updates** | ✅ Automatic (instant) | ❌ Manual APK updates |
| **Kiosk mode** | ⚠️ Limited (browser) | ✅ True kiosk lock |
| **Speech synthesis** | ⚠️ Browser dependent | ✅ Native API |
| **Camera** | ⚠️ Browser limited | ✅ Full camera API |
| **File size** | ✅ ~5MB cached | ❌ ~50MB APK |
| **Development time** | ✅ 1-2 days | ⚠️ 5 days |
| **Works on iOS** | ✅ Yes (limited) | ❌ Android only |

## Recommendation

For your kiosk use case:

**Start with PWA** (this guide) because:
- Quick to implement (can be done today)
- Will immediately improve performance vs Fully Kiosk
- Offline caching helps with lag
- Automatic updates are huge for kiosks

**Later upgrade to Native App** if you need:
- True kiosk lockdown (prevent exit)
- Guaranteed speech synthesis
- Maximum performance
- Advanced camera features

## Next Steps

Would you like me to:
1. Implement the PWA conversion now?
2. Generate the app icons?
3. Set up the service worker?
