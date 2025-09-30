import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  useMapEvent,
  useMap
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Geocoder (styled, Chicago-biased) + CSS
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import 'leaflet-control-geocoder'

// Fix default marker icon paths (vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

/**
 * Glassy, Chicago-biased geocoder placed top-center with a centered “×” clear button.
 */
function GeocoderTopCenter({ placeholder = 'Search Chicago & nearby…' }) {
  const map = useMap()
  const hostRef = useRef(null)
  const shellRef = useRef(null)
  const geocoderRef = useRef(null)
  const clearBtnRef = useRef(null)
  const inputRef = useRef(null)
  const altsRef = useRef(null)

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

    // Glass shell
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
    })
    hostRef.current.appendChild(shell)
    shellRef.current = shell

    // Chicago-biased Nominatim
    const geocoder = L.Control.geocoder({
      geocoder: L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
          viewbox: '-88.5,42.6,-87.3,41.4',
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
      shell.appendChild(ctrlEl)

      // prevent map interactions
      L.DomEvent.disableClickPropagation(shell)
      L.DomEvent.disableScrollPropagation(shell)

      // neutralize default control UI
      ctrlEl.style.background = 'transparent'
      ctrlEl.style.border = 'none'
      ctrlEl.style.boxShadow = 'none'
      ctrlEl.style.margin = '0'
      ctrlEl.style.padding = '0'

      const input = ctrlEl.querySelector('.leaflet-control-geocoder-form input')
      inputRef.current = input || null
      if (input) {
        Object.assign(input.style, {
          background: 'rgba(0,0,0,0.22)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#e9eef3',
          padding: '10px 12px',
          borderRadius: '10px',
          outline: 'none',
          width: 'min(72vw, 520px)',
        })
        input.placeholder = placeholder
      }

      const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon')
      if (iconBtn) iconBtn.style.display = 'none'

      const alts = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives')
      altsRef.current = alts || null
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
          overscrollBehavior: 'contain'
        })
      }

      // Clear (“×”) button centered with flex
      const clearBtn = L.DomUtil.create('button', 'map-search-clear', shell)
      clearBtnRef.current = clearBtn
      clearBtn.type = 'button'
      clearBtn.title = 'Clear search'
      clearBtn.setAttribute('aria-label', 'Clear search')
      clearBtn.innerHTML = '&times;'
      Object.assign(clearBtn.style, {
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.22)',
        color: '#e9eef3',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        display: 'none', // toggled by input listener
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        lineHeight: '1',
        padding: '0',
        cursor: 'pointer',
      })
      L.DomEvent.disableClickPropagation(clearBtn)
      L.DomEvent.on(clearBtn, 'click', (ev) => {
        ev.preventDefault(); ev.stopPropagation()
        if (inputRef.current) {
          inputRef.current.value = ''
          inputRef.current.focus()
        }
        if (geocoderRef.current?._clearResults) {
          geocoderRef.current._clearResults()
        } else if (altsRef.current) {
          altsRef.current.innerHTML = ''
          altsRef.current.style.display = 'none'
          requestAnimationFrame(() => { altsRef.current && (altsRef.current.style.display = '') })
        }
        clearBtn.style.display = 'none'
      })

      const onInput = () => {
        if (!clearBtnRef.current || !inputRef.current) return
        clearBtnRef.current.style.display =
          inputRef.current.value.trim() ? 'inline-flex' : 'none'
      }
      if (inputRef.current) {
        inputRef.current.addEventListener('input', onInput)
        onInput()
      }

      // cleanup input listener on unmount
      return () => {
        if (inputRef.current) inputRef.current.removeEventListener('input', onInput)
      }
    }

    return () => {}
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

        {/* Glassy geocoder with centered clear button */}
        <GeocoderTopCenter />

        {/* Click handler for placing pins */}
        <ClickToPick onPick={onPick} />

        {/* Overlays / children */}
        {children}
      </MapContainer>
    </div>
  )
}
