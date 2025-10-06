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
                console.log('[PWA] New version available! Will reload after idle.');

                // Auto-reload after 1 minute of idle (for kiosk)
                let idleTimer;
                const resetIdleTimer = () => {
                  clearTimeout(idleTimer);
                  idleTimer = setTimeout(() => {
                    console.log('[PWA] Auto-reloading for update...');
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }, 60000);
                };

                // Reset timer on user activity
                ['pointerdown', 'keydown'].forEach(event => {
                  window.addEventListener(event, resetIdleTimer);
                });

                resetIdleTimer();
              }
            });
          });
        })
        .catch(error => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Listen for controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New service worker activated');
      });
    });
  } else {
    console.warn('[PWA] Service Workers not supported');
  }
}

// Prompt for PWA installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Install prompt available');
  e.preventDefault();
  deferredPrompt = e;

  // Dispatch custom event that can be caught by components
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

export function showInstallPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install');
      } else {
        console.log('[PWA] User dismissed install');
      }
      deferredPrompt = null;
    });
  } else {
    console.log('[PWA] Install prompt not available');
  }
}

// Check if running as installed PWA
export function isPWA() {
  return window.matchMedia('(display-mode: fullscreen)').matches ||
         window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Clear all caches (useful for debugging)
export async function clearAllCaches() {
  if ('serviceWorker' in navigator && 'caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[PWA] All caches cleared');

    // Send message to service worker to reload
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }
}
