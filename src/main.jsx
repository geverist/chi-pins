import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import TableMode from './routes/TableMode.jsx'
import Admin from './routes/Admin.jsx'
import { NowPlayingProvider } from './state/useNowPlaying.jsx'
import { registerServiceWorker } from './registerServiceWorker.js'
import { startBackgroundPrefetch } from './lib/tilePrefetch.js'
import { perfMonitor } from './lib/performanceMonitor.js'
import './styles.css'
import './styles/transitions.css'

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

// Register PWA service worker
registerServiceWorker();

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
