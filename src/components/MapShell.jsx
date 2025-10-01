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

// Map utils for camera presets
import {
  CHI, CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM,
  USA, GLOBAL_ZOOM,
} from '../lib/mapUtils'

// Fix default marker icon paths (vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

/* ------------------------ Chicago/global glassy search ------------------------ */
function GeocoderTopCenter({
  placeholder = 'Search Chicago & nearby…',
  mode = 'chicago',                  // 'chicago' | 'global'
  clearToken = 0,                     // bump to clear input/results (e.g., on idle)
}) {
  const map = useMap()
  const hostRef = useRef(null)
  const shellRef = useRef(null)
  const geocoderRef = useRef(null)
  const inputRef = useRef(null)
  const clearBtnRef = useRef(null)

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
      if (hostRef.current?.parentNode) hostRef.current.parentNode.removeChild(hostRef.current)
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

    if (ctrlEl) {
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

      // style the input (lighter text for contrast)
      const input = ctrlEl.querySelector('.leaflet-control-geocoder-form input')
      inputRef.current = input
      if (input) {
        Object.assign(input.style, {
          background: 'rgba(0,0,0,0.22)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#e9eef3',                         // higher contrast
          padding: '10px 36px 10px 12px',           // room for clear “×”
          borderRadius: '10px',
          outline: 'none',
          width: 'min(72vw, 520px)',
          fontWeight: 600,
        })
        input.placeholder = mode === 'global' ? 'Search places worldwide…' : placeholder
      }

      // hide default icon button
      const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon')
      if (iconBtn) iconBtn.style.display = 'none'

      // style results dropdown
      const alts = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
      if (alts) {
        Object.assign(alts.style, {
          background: 'rgba(16,17,20,0.92)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: '#e9eef3',
          borderRadius: '10px',
          marginTop: '8px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          maxHeight: '50vh',
          overscrollBehavior: 'contain',
        })
      }

      // Add a centered "×" clear button inside the shell
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
        display: 'none', // hidden until there’s text
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
      })
      clearBtn.textContent = '×'
      clearBtn.title = 'Clear'
      clearBtnRef.current = clearBtn

      // ensure clear button doesn't interact with the map
      L.DomEvent.disableClickPropagation(clearBtn)
      clearBtn.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        const g = geocoderRef.current
        const i = inputRef.current
        if (i) {
          i.value = ''
          i.dispatchEvent(new Event('input', { bubbles: true }))
        }
        if (g && g._input) g._input.value = ''
        try { g?._clearResults?.() } catch {}
        const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
        if (list) list.style.display = 'none'
        clearBtn.style.display = 'none'
        i?.focus()
      })

      // toggle clear button visibility on input
      const onInput = () => {
        const hasText = !!input?.value
        clearBtn.style.display = hasText ? 'inline-flex' : 'none'
      }
      input?.addEventListener('input', onInput)
      onInput() // initial state

      // cleanup listeners we attached
      return () => {
        input?.removeEventListener('input', onInput)
      }
    }

    return () => {
      if (geocoderRef.current) {
        geocoderRef.current.remove()
        geocoderRef.current = null
      }
      if (shellRef.current?.parentNode) shellRef.current.parentNode.removeChild(shellRef.current)
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
    }
    if (g && g._input) g._input.value = ''
    try { g?._clearResults?.() } catch {}
    // hide dropdown if present
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

  // Initial mount → Chicago view (no maxBounds)
  useEffect(() => {
    // Chicago camera limits only (no pannable bounds)
    map.setMinZoom(CHI_MIN_ZOOM)
    map.setMaxZoom(CHI_MAX_ZOOM)
    map.setMaxBounds(null)
    map.fitBounds(CHI_BOUNDS, { animate: false })

    // enable interactions
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
        // Global: totally free pan/zoom (no bounds)
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
        // Chicago: only min/max zoom; no bounds
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

/** Let App force a camera reset to full-Chicago even if already in Chicago. */
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
  resetCameraToken,         // optional: token to force Chicago refit
  editing = false,          // optional: hide search while editing
  clearSearchToken = 0,     // bump this (e.g., on idle) to clear geocoder text/results
}) {
  // Initial mount center/zoom; MapModeController will take over on changes
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

        {/* Chicago/global camera behavior */}
        <MapModeController mode={mapMode} />

        {/* Allow App to force a Chicago refit without changing mode */}
        <CameraReset mapMode={mapMode} resetCameraToken={resetCameraToken} />

        {/* Glassy, high-contrast geocoder (hidden while editing) */}
        {!editing && (
          <GeocoderTopCenter
            mode={mapMode === 'global' ? 'global' : 'chicago'}
            clearToken={clearSearchToken}
          />
        )}

        {/* Click handler for placing pins; disabled while exploring */}
        <TapToPlace onPick={onPick} disabled={!!exploring} />

        {/* Overlays / children */}
        {children}
      </MapContainer>
    </div>
  )
}
