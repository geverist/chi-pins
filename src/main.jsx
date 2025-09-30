import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import TableMode from './routes/TableMode.jsx'
import Admin from './routes/Admin.jsx'
import './styles.css'

// src/main.jsx
// src/main.jsx
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
    <RouterProvider router={router} />
  </React.StrictMode>
)
