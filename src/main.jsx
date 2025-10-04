import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import TableMode from './routes/TableMode.jsx'
import Admin from './routes/Admin.jsx'
import { NowPlayingProvider } from './state/useNowPlaying.jsx'
import './styles.css'

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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
   window.addEventListener('load', () => {
     navigator.serviceWorker.register('/sw.js')
   })
 }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NowPlayingProvider>
      <RouterProvider router={router} />
    </NowPlayingProvider>
  </React.StrictMode>
)
