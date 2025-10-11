import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import TableMode from './routes/TableMode.jsx'
import Admin from './routes/Admin.jsx'
import { NowPlayingProvider } from './state/useNowPlaying.jsx'
import { Capacitor } from '@capacitor/core'
import { registerServiceWorker } from './registerServiceWorker.js'
import { startBackgroundPrefetch } from './lib/tilePrefetch.js'
import { perfMonitor } from './lib/performanceMonitor.js'
import performanceDiagnostics from './lib/performanceDiagnostics.js'
import './styles.css'
import './styles/transitions.css'

// Initialize performance diagnostics (available at window.performanceDiagnostics)
console.log('[Diagnostics] Performance diagnostics available at window.performanceDiagnostics')

// Performance: Disable verbose console logging in production
// Keep errors and warnings for critical debugging
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;

  // Also reduce console.warn spam in production (only show critical warnings)
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Filter out non-critical warnings
    const message = args[0]?.toString() || '';
    if (
      message.includes('mainMapRef.current is null') ||
      message.includes('Geocoder removal error') ||
      message.includes('Speech recognition cleanup')
    ) {
      return; // Silently ignore these expected warnings
    }
    originalWarn.apply(console, args);
  };
}

// Set CSS custom property for actual viewport height (fixes Safari)
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100);
});

const router = createBrowserRouter(
  [
    { path: '/', element: <App /> },
    { path: '/t/:venue', element: <TableMode /> },
    { path: '/admin', element: <Admin /> },
  ],
  { future: { v7_startTransition: true } }
);

// Register PWA service worker (only for web, not for native Android)
if (!Capacitor.isNativePlatform()) {
  console.log('[PWA] Registering service worker for web platform');
  registerServiceWorker();
} else {
  console.log('[PWA] Skipping service worker registration for native platform');
}

// Start prefetching Chicago map tiles in background (after 5 second delay)
startBackgroundPrefetch({
  delay: 5000,
  zoomLevels: [10, 11, 12, 13], // Cache zoom levels 10-13
  maxConcurrent: 4, // Limit concurrent requests to avoid overwhelming connection
  onProgress: (current, total) => {
    if (current % 100 === 0) {
      console.log(`[Prefetch] ${current}/${total} tiles cached (${Math.round(current / total * 100)}%)`);
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NowPlayingProvider>
      <RouterProvider router={router} />
    </NowPlayingProvider>
  </React.StrictMode>
)
