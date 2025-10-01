// components/MapShell.jsx
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'

// Geocoder (Nominatim) control
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import 'leaflet-control-geocoder'

import {
  CHI, CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM,
  USA, GLOBAL_ZOOM,
} from '../lib/mapUtils'

/* ------------------------ Chicago-biased glassy search ------------------------ */
function GeocoderTopCenter({ placeholder = 'Search Chicago & nearby…' }) {
  const map = useMap()
  const hostRef = useRef(null)
  const shellRef = useRef(null)
  const geocoderRef = useRef(null)
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

  // Mount the geocoder control into a glassy shell
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
      background: 'rgba(12,13,16,0.55)',
      border: '1px solid rgba(255,255,255,0.20)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      position: 'relative',
    })
    hostRef.current.appendChild(shell)
    shellRef.current = shell

    // Build geocoder, biased to Chicagoland
    const geocoder = L.Control.geocoder({
      geocoder: L.Control.Geocoder.nominatim({
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
      placeholder,
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

      // style the input (higher contrast)
      const input = ctrlEl.querySelector('.leaflet-control-geocoder-form input')
      if (input) {
        Object.assign(input.style, {
          background: 'rgba(0,0,0,0.30)',
          border: '1px solid rgba(255,255,255,0.28)',
          color: '#ffffff',
          padding: '10px 36px 10px 12px', // space for clear "×"
          borderRadius: '10px',
          outline: 'none',
          width: 'min(72vw, 520px)',
          fontWeight: 600,
        })
        input.placeholder = placeholder

        // placeholder contrast
        input.addEventListener('focus', () => {
          input.style.border = '1px solid #7fb1ff'
          input.style.boxShadow = '0 0 0 2px rgba(127,177,255,0.25)'
        })
        input.addEventListener('blur', () => {
          input.style.border = '1px solid rgba(255,255,255,0.28)'
          input.style.boxShadow = 'none'
        })
      }

      // hide default icon button (Enter/typing still works)
      const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon')
      if (iconBtn) iconBtn.style.display = 'none'

      // style results dropdown (higher contrast)
      const alts = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
      if (alts) {
        Object.assign(alts.style, {
          background: 'rgba(12,13,16,0.98)',
          border: '1px solid rgba(255,255,255,0.20)',
          color: '#ffffff',
          borderRadius: '10px',
          marginTop: '8px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
          overflow: 'auto',
          maxHeight: '50vh',
          overscrollBehavior: 'contain',
        })
        // make each item higher contrast & full-width hit area
        alts.querySelectorAll('a').forEach(a => {
          a.style.color = '#ffffff'
          a.style.textDecoration = 'none'
          a.style.display = 'block'
          a.style.padding = '8px 10px'
        })
      }

      // Add a centered "×" clear button inside the shell (fully functional)
      const clearBtn = L.DomUtil.create('button', 'map-search-clear', shell)
      Object.assign(clearBtn.style, {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.30)',
        background: 'rgba(255,255,255,0.12)',
        color: '#ffffff',
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
      clearBtn.setAttribute('type', 'button')
      clearBtn.setAttribute('aria-label', 'Clear search')
      clearBtnRef.current = clearBtn

      // ensure clear button doesn't interact with the map
      L.DomEvent.disableClickPropagation(clearBtn)
      clearBtn.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        if (input) {
          input.value = ''
          input.dispatchEvent(new Event('input', { bubbles: true }))
          // hide results, if open
          const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
          if (list) list.style.display = 'none'
          input.focus()
        }
        clearBtn.style.display = 'none'
      })

      // toggle clear button visibility on input
      const onInput = () => {
        const hasText = !!input?.value
        clearBtn.style.display = hasText ? 'inline-flex' : 'none'
        // if user typed again, ensure results container can re-show
        const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
        if (list && hasText) list.style.display = ''
      }
      input?.addEventListener('input', onInput)
      onInput() // initialize

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
  }, [map, placeholder])

  return null
}
/* --------------------------------------------------------------------------- */

function MapModeController({ mode, onMapReady }) {
  const map = useMap()

  // Initial mount → Chicago view (no maxBounds)
  useEffect(() => {
    onMapReady?.(map)

    // Chicago camera limits only (no pannable bounds)
    map.setMinZoom(CHI_MIN_ZOOM)
    map.setMaxZoom(CHI_MAX_ZOOM)
    map.setMaxBounds(null) // ensure no residual bounds
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

function TapToPlace({ onPick, disabled = false }) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng })
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
  return (
    <MapContainer
      center={[CHI.lat, CHI.lng]}
      zoom={10}
      style={{ height:'100%', width:'100%' }}
      worldCopyJump={true}
      scrollWheelZoom
      wheelPxPerZoomLevel={90}
      whenCreated={(m) => { if (mainMapRef) mainMapRef.current = m }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Glassy Chicago-biased search (top/center) */}
      <GeocoderTopCenter />

      <MapModeController mode={mapMode} onMapReady={(m)=>{ if (mainMapRef) mainMapRef.current = m }} />

      {/* Disable click-to-place while exploring */}
      <TapToPlace onPick={onPick} disabled={exploring} />

      {children}
    </MapContainer>
  )
}
