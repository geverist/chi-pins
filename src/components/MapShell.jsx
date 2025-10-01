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

// Map utils
import {
  CHI, CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM,
  USA, GLOBAL_ZOOM,
} from '../lib/mapUtils'

// Fix default marker icon paths (vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

/* ---------- one-time CSS injector so ALL text is consistently styled ---------- */
let __searchCssInjected = false
function ensureSearchCss() {
  if (__searchCssInjected || typeof document === 'undefined') return
  const css = `
    /* Input text + placeholder (high contrast) */
    .map-search-wrap .leaflet-control-geocoder-form input {
      color: #e9eef3 !important;
      background: rgba(0,0,0,0.22) !important;
      border: 1px solid rgba(255,255,255,0.18) !important;
      font-weight: 600 !important;
    }
    .map-search-wrap .leaflet-control-geocoder-form input::placeholder {
      color: #cfd6de !important;
      opacity: 0.95 !important;
    }
    /* Extra placeholder vendor selectors for stubborn browsers */
    .map-search-wrap .leaflet-control-geocoder-form input::-webkit-input-placeholder { color: #cfd6de !important; opacity: 0.95 !important; }
    .map-search-wrap .leaflet-control-geocoder-form input:-ms-input-placeholder { color: #cfd6de !important; opacity: 0.95 !important; }
    .map-search-wrap .leaflet-control-geocoder-form input::-ms-input-placeholder { color: #cfd6de !important; opacity: 0.95 !important; }

    /* Results text/links */
    .map-search-wrap .leaflet-control-geocoder-alternatives {
      background: rgba(16,17,20,0.92) !important;
      border: 1px solid rgba(255,255,255,0.14) !important;
      color: #e9eef3 !important;
      border-radius: 10px !important;
      box-shadow: 0 12px 28px rgba(0,0,0,0.35) !important;
      overflow: hidden !important;
      max-height: 50vh !important;
      overscroll-behavior: contain !important;
    }
    .map-search-wrap .leaflet-control-geocoder-alternatives a {
      color: #e9eef3 !important;
      text-decoration: none !important;
      display: block !important;
      padding: 8px 10px !important;
    }
    .map-search-wrap .leaflet-control-geocoder-alternatives li + li a {
      border-top: 1px solid rgba(255,255,255,0.10) !important;
    }
    .map-search-wrap .leaflet-control-geocoder-alternatives a:hover {
      background: rgba(255,255,255,0.06) !important;
    }
  `
  const style = document.createElement('style')
  style.setAttribute('data-map-search-css', '1')
  style.textContent = css
  document.head.appendChild(style)
  __searchCssInjected = true
}

/* ------------------------ Chicago/global glassy search ------------------------ */
function GeocoderTopCenter({
  placeholder = 'Search Chicago & nearby…',
  mode = 'chicago',      // 'chicago' | 'global'
  clearToken = 0,        // bump to clear input/results (e.g., on idle)
}) {
  const map = useMap()
  const hostRef = useRef(null)
  const shellRef = useRef(null)
  const geocoderRef = useRef(null)
  const inputRef = useRef(null)     // bind to geocoder._input (canonical)
  const clearBtnRef = useRef(null)

  useEffect(() => { ensureSearchCss() }, [])

  // Create a top-center host on mount
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
      hostRef.current?.parentNode?.removeChild(hostRef.current)
      hostRef.current = null
    }
  }, [map])

  // Build (or rebuild) the geocoder when mode changes
  useEffect(() => {
    if (!map || !hostRef.current) return

    // outer glass shell
    const shell = L.DomUtil.create('div', 'map-search-wrap glass')
    Object.assign(shell.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '12px',
      backdropFilter: 'blur(6px) saturate(115%)',
      WebkitBackdropFilter: 'blur(6px) saturate(115%)',
      background: 'rgba(16,17,20,0.45)',
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.30)',
      position: 'relative',
    })
    hostRef.current.appendChild(shell)
    shellRef.current = shell

    // Chicago-biased vs Global geocoder
    const geocoder = L.Control.geocoder({
      geocoder: mode === 'global'
        ? L.Control.Geocoder.nominatim({
            geocodingQueryParams: {
              // no viewbox; worldwide
              addressdetails: 1,
              limit: 10,
            }
          })
        : L.Control.Geocoder.nominatim({
            geocodingQueryParams: {
              viewbox: '-88.5,42.6,-87.3,41.4', // Chicagoland bbox
              bounded: 1,
              countrycodes: 'us',
              addressdetails: 1,
              limit: 10,
            }
          }),
      defaultMarkGeocode: false,
      collapsed: false,
      placeholder: mode === 'global' ? 'Search places worldwide…' : placeholder,
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

    // move into our glass shell
    shell.appendChild(ctrlEl)

    // prevent search interactions from propagating to the map
    L.DomEvent.disableClickPropagation(shell)
    L.DomEvent.disableScrollPropagation(shell)

    // neutralize default chrome
    Object.assign(ctrlEl.style, {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      margin: '0',
      padding: '0',
    })

    // 🔑 Use the plugin-owned input — stable across versions
    const input =
      geocoder._input ||
      ctrlEl.querySelector('input') ||
      ctrlEl.querySelector('.leaflet-control-geocoder-form input')
    inputRef.current = input
    if (input) {
      input.style.padding = '10px 36px 10px 12px' // room for ×
      input.style.borderRadius = '10px'
      input.style.outline = 'none'
      input.style.width = 'min(72vw, 520px)'
      input.placeholder = mode === 'global' ? 'Search places worldwide…' : placeholder
      // also clear on Escape
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation()
          clearAll()
        }
      })
    }

    // hide default icon button (typing/enter still works)
    const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon')
    if (iconBtn) iconBtn.style.display = 'none'

    // results dropdown (styled by CSS injector)

    // Clear button
    const clearBtn = L.DomUtil.create('button', 'map-search-clear', shell)
    Object.assign(clearBtn.style, {
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(0,0,0,0.35)',
      color: '#e9eef3',
      cursor: 'pointer',
      fontSize: '14px',
      lineHeight: '1',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      zIndex: 3700, // make sure it’s over the map UI
    })
    clearBtn.textContent = '×'
    clearBtn.title = 'Clear'
    clearBtnRef.current = clearBtn
    L.DomEvent.disableClickPropagation(clearBtn)

    const showHideClear = () => {
      const v = inputRef.current?.value ?? ''
      clearBtn.style.display = v ? 'inline-flex' : 'none'
    }

    function clearAll() {
      const g = geocoderRef.current
      const i = inputRef.current
      if (i) {
        i.value = ''
        // fire both input & change to catch all listeners
        i.dispatchEvent(new Event('input', { bubbles: true }))
        i.dispatchEvent(new Event('change', { bubbles: true }))
      }
      if (g && g._input) g._input.value = ''
      try { g?._clearResults?.() } catch {}
      const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
      if (list) list.style.display = 'none'
      clearBtn.style.display = 'none'
    }

    clearBtn.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      clearAll()
      inputRef.current?.focus()
    })

    // Robust visibility updates (type, paste, IME, programmatic)
    input?.addEventListener('input', showHideClear)
    input?.addEventListener('keyup', showHideClear)
    input?.addEventListener('change', showHideClear)
    // MutationObserver in case plugin writes value programmatically
    const mo = input
      ? new MutationObserver(showHideClear)
      : null
    if (mo && input) mo.observe(input, { attributes: true, attributeFilter: ['value'] })

    showHideClear() // initial state

    // CLEANUP
    return () => {
      try {
        input?.removeEventListener('input', showHideClear)
        input?.removeEventListener('keyup', showHideClear)
        input?.removeEventListener('change', showHideClear)
        mo?.disconnect()
        clearBtn?.remove()
        geocoder.remove()
      } catch {}
      geocoderRef.current = null
      inputRef.current = null
      clearBtnRef.current = null
      shellRef.current?.parentNode?.removeChild(shellRef.current)
      shellRef.current = null
    }
  }, [map, placeholder, mode])

  // Clear on demand (e.g., idle timer)
  useEffect(() => {
    const g = geocoderRef.current
    const i = inputRef.current
    if (!g && !i) return
    if (i) {
      i.value = ''
      i.dispatchEvent(new Event('input', { bubbles: true }))
      i.dispatchEvent(new Event('change', { bubbles: true }))
    }
    if (g && g._input) g._input.value = ''
    try { g?._clearResults?.() } catch {}
    const ctrlEl = g?._container
    if (ctrlEl) {
      const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
      if (list) list.style.display = 'none'
    }
    if (clearBtnRef.current) clearBtnRef.current.style.display = 'none'
  }, [clearToken])

  return null
}
/* --------------------------------------------------------------------------- */

function MapModeController({ mode }) {
  const map = useMap()

  // Initial mount → Chicago view
  useEffect(() => {
    map.setMinZoom(CHI_MIN_ZOOM)
    map.setMaxZoom(CHI_MAX_ZOOM)
    map.setMaxBounds(null)
    map.fitBounds(CHI_BOUNDS, { animate: false })
    map.dragging?.enable()
    map.scrollWheelZoom?.enable()
    map.touchZoom?.enable()
    map.boxZoom?.enable()
    map.keyboard?.enable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only

  // Respond to mode changes
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()

      if (mode === 'global') {
        map.setMaxBounds(null)
        map.setMinZoom(2)
        map.setMaxZoom(19)
        map.setView([USA.lat, USA.lng], GLOBAL_ZOOM, { animate: true })
        map.dragging?.enable()
        map.scrollWheelZoom?.enable()
        map.touchZoom?.enable()
        map.boxZoom?.enable()
        map.keyboard?.enable()
      } else {
        map.setMaxBounds(null)
        map.setMinZoom(CHI_MIN_ZOOM)
        map.setMaxZoom(CHI_MAX_ZOOM)
        map.fitBounds(CHI_BOUNDS, { animate: true })
        map.dragging?.enable()
        map.scrollWheelZoom?.enable()
        map.touchZoom?.enable()
        map.boxZoom?.enable()
        map.keyboard?.enable()
      }
    }, 0)
  }, [mode, map])

  return null
}

function CameraReset({ mapMode, resetCameraToken }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    if (mapMode !== 'chicago') return
    setTimeout(() => {
      try {
        map.invalidateSize()
        map.fitBounds(CHI_BOUNDS, { animate: true })
      } catch {}
    }, 0)
  }, [resetCameraToken, mapMode, map])
  return null
}

function TapToPlace({ onPick, disabled = false }) {
  useMapEvent('click', (e) => {
    if (disabled) return
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
  children,
  resetCameraToken,
  editing = false,
  clearSearchToken = 0,
}) {
  const center = useMemo(() => [CHI.lat, CHI.lng], [])
  const zoom = useMemo(() => 10, [])
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
        worldCopyJump={true}
        scrollWheelZoom
        wheelPxPerZoomLevel={90}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        <MapModeController mode={mapMode} />
        <CameraReset mapMode={mapMode} resetCameraToken={resetCameraToken} />

        {/* Search hidden while editing pins */}
        {!editing && (
          <GeocoderTopCenter
            mode={mapMode === 'global' ? 'global' : 'chicago'}
            clearToken={clearSearchToken}
          />
        )}

        <TapToPlace onPick={onPick} disabled={!!exploring} />
        {children}
      </MapContainer>
    </div>
  )
}
