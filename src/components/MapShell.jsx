// src/components/MapShell.jsx
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  useMapEvent,
  useMap
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Geocoder
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import 'leaflet-control-geocoder'

// Fix default marker icon paths (vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

/** Inject one-off CSS for placeholder + hover states (needed for ::placeholder) */
let __searchCssInjected = false
function ensureSearchCss() {
  if (__searchCssInjected) return
  const css = `
    .map-search-wrap input::placeholder { color: #cfd6de; opacity: 0.95; }
    .map-search-wrap .leaflet-control-geocoder-alternatives a {
      color: #fff; text-decoration: none; display: block;
      padding: 8px 10px;
    }
    .map-search-wrap .leaflet-control-geocoder-alternatives a:hover {
      background: rgba(255,255,255,0.06);
    }
    .map-search-wrap .leaflet-control-geocoder-alternatives li + li a {
      border-top: 1px solid rgba(255,255,255,0.10);
    }
    .map-search-wrap .leaflet-control-geocoder-alternatives {
      scrollbar-width: thin;
    }
  `
  const style = document.createElement('style')
  style.setAttribute('data-map-search-css', '1')
  style.textContent = css
  document.head.appendChild(style)
  __searchCssInjected = true
}

/**
 * High-contrast, glassy, Chicago-biased geocoder placed top-center.
 */
function GeocoderTopCenter({ placeholder = 'Search Chicago & nearby…' }) {
  const map = useMap()
  const hostRef = useRef(null)
  const shellRef = useRef(null)
  const geocoderRef = useRef(null)
  const inputRef = useRef(null)
  const clearBtnRef = useRef(null)

  useEffect(() => { ensureSearchCss() }, [])

  // Create a top-center host
  useEffect(() => {
    if (!map) return
    const host = L.DomUtil.create('div', 'map-search-host')
    Object.assign(host.style, {
      position: 'absolute',
      left: '50%',
      top: '10px',
      transform: 'translateX(-50%)',
      zIndex: 3600,
      pointerEvents: 'auto',
      maxWidth: 'min(92vw, 720px)',
      width: 'max-content',
    })
    map.getContainer().appendChild(host)
    hostRef.current = host
    return () => {
      if (hostRef.current?.parentNode) hostRef.current.parentNode.removeChild(hostRef.current)
      hostRef.current = null
    }
  }, [map])

  // Mount the geocoder and glass shell
  useEffect(() => {
    if (!map || !hostRef.current) return

    // Glass shell that will hold the geocoder control
    const shell = L.DomUtil.create('div', 'map-search-wrap glass')
    Object.assign(shell.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '12px',
      backdropFilter: 'blur(6px) saturate(115%)',
      WebkitBackdropFilter: 'blur(6px) saturate(115%)',
      background: 'rgba(16,17,20,0.55)',
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      position: 'relative',
    })
    hostRef.current.appendChild(shell)
    shellRef.current = shell

    // Chicago-biased Nominatim
    const geocoder = L.Control.geocoder({
      geocoder: L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
          viewbox: '-88.5,42.6,-87.3,41.4', // Chicagoland
          bounded: 1,
          countrycodes: 'us',
          addressdetails: 1,
          limit: 10
        }
      }),
      defaultMarkGeocode: false,
      collapsed: false,
      placeholder
    })

    geocoder.on('markgeocode', (e) => {
      const center = e?.geocode?.center
      if (center) {
        const targetZoom = Math.max(map.getZoom() ?? 0, 13)
        map.flyTo(center, targetZoom)
      }
    })

    geocoder.addTo(map)
    geocoderRef.current = geocoder
    const ctrlEl = geocoder._container

    if (ctrlEl) {
      // move control into our glass shell
      shell.appendChild(ctrlEl)

      // disable event propagation so it never places pins while typing/scrolling
      L.DomEvent.disableClickPropagation(shell)
      L.DomEvent.disableScrollPropagation(shell)

      // neutralize default UI; our CSS takes over
      Object.assign(ctrlEl.style, {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        margin: '0',
        padding: '0',
      })

      // Input tweaks: higher contrast
      const input = ctrlEl.querySelector('.leaflet-control-geocoder-form input')
      inputRef.current = input
      if (input) {
        Object.assign(input.style, {
          background: 'rgba(8,9,11,0.66)',           // darker for contrast
          border: '1px solid rgba(255,255,255,0.32)',// stronger border
          color: '#ffffff',                          // high contrast text
          padding: '10px 36px 10px 12px',            // leave room for clear "X"
          borderRadius: '10px',
          outline: 'none',
          width: 'min(72vw, 520px)',
          fontSize: '14px',
          fontWeight: 600,
        })
        input.placeholder = placeholder

        // focus ring
        input.addEventListener('focus', () => {
          input.style.border = '1px solid #7fb1ff'
          input.style.boxShadow = '0 0 0 2px rgba(127,177,255,0.25)'
        })
        input.addEventListener('blur', () => {
          input.style.border = '1px solid rgba(255,255,255,0.32)'
          input.style.boxShadow = 'none'
        })
      }

      // Hide default icon button
      const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon')
      if (iconBtn) iconBtn.style.display = 'none'

      // Results list: keep contrast
      const alts = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
      if (alts) {
        Object.assign(alts.style, {
          background: 'rgba(16,17,20,0.96)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#ffffff',
          borderRadius: '10px',
          marginTop: '8px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
          overflow: 'auto',
          maxHeight: '50vh',
          overscrollBehavior: 'contain'
        })
      }

      // Clear “X”
      const clearBtn = L.DomUtil.create('button', 'map-search-clear', shell)
      clearBtnRef.current = clearBtn
      clearBtn.setAttribute('type', 'button')
      clearBtn.setAttribute('aria-label', 'Clear search')
      clearBtn.innerHTML = '&times;'
      Object.assign(clearBtn.style, {
        position: 'absolute',
        right: '12px',
        // vertically center relative to input (10px padding + ~24px line)
        top: '50%',
        transform: 'translateY(-50%)',
        width: '22px',
        height: '22px',
        lineHeight: '22px',
        textAlign: 'center',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.10)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '0',
      })

      // Keep “X” above input but inside the shell
      shell.style.paddingRight = '40px'

      L.DomEvent.disableClickPropagation(clearBtn)
      L.DomEvent.on(clearBtn, 'click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const i = inputRef.current
        if (i) {
          i.value = ''
          // attempt to collapse results if present
          try { geocoderRef.current?._clearResults?.() } catch {}
          // move focus back to input
          i.focus()
        }
      })
    }

    return () => {
      try {
        const ctrlEl2 = geocoderRef.current?._container
        if (ctrlEl2 && shellRef.current && ctrlEl2.parentNode === shellRef.current) {
          shellRef.current.removeChild(ctrlEl2)
        }
      } catch {}
      if (geocoderRef.current) {
        geocoderRef.current.remove()
        geocoderRef.current = null
      }
      if (clearBtnRef.current?.parentNode) {
        clearBtnRef.current.parentNode.removeChild(clearBtnRef.current)
      }
      clearBtnRef.current = null
      if (shellRef.current?.parentNode) {
        shellRef.current.parentNode.removeChild(shellRef.current)
      }
      shellRef.current = null
    }
  }, [map, placeholder])

  return null
}

function ClickToPick({ onPick }) {
  useMapEvent('click', (e) => {
    if (!onPick) return
    const { lat, lng } = e.latlng || {}
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onPick({ lat, lng })
    }
  })
  return null
}

export default function MapShell({
  mapMode,
  mainMapRef,
  exploring,
  onPick,
  children
}) {
  const center = useMemo(() => [41.8781, -87.6298], [])
  const zoom = useMemo(() => (mapMode === 'global' ? 3 : 11), [mapMode])

  const whenCreated = (map) => { if (mainMapRef) mainMapRef.current = map }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={2}
        maxZoom={19}
        zoomControl={true}
        whenCreated={whenCreated}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {/* Glassy, high-contrast geocoder */}
        <GeocoderTopCenter />

        {/* Click handler for placing pins (unchanged) */}
        <ClickToPick onPick={onPick} />

        {/* Overlays / children (unchanged) */}
        {children}
      </MapContainer>
    </div>
  )
}
