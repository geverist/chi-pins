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

// ✅ Geocoder (Option 1)
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import 'leaflet-control-geocoder'

// Keep Leaflet’s default icon paths happy in bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Fix default icon (vite/webpack)
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

/**
 * Geocoder control that:
 * - Uses Nominatim (open)
 * - Biases results to Chicagoland via viewbox + bounded + US country code
 * - Renders top-center (not in a corner)
 * - Disables click/scroll propagation so it won’t place pins when typing
 * - On select, flies to the result (min zoom 13)
 */
function GeocoderTopCenter({ placeholder = 'Search Chicago & nearby…' }) {
  const map = useMap()
  const hostRef = useRef(null)
  const geocoderRef = useRef(null)

  // Create a top-center host for the control
  useEffect(() => {
    if (!map) return
    const container = L.DomUtil.create('div', 'map-search-host')
    Object.assign(container.style, {
      position: 'absolute',
      left: '50%',
      top: '8px',
      transform: 'translateX(-50%)',
      zIndex: 3600,
      pointerEvents: 'auto',
      // small shadow and rounded style so it looks at home
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    })

    // Add to the map container
    const mapContainer = map.getContainer()
    mapContainer.appendChild(container)
    hostRef.current = container

    return () => {
      if (hostRef.current && hostRef.current.parentNode) {
        hostRef.current.parentNode.removeChild(hostRef.current)
      }
      hostRef.current = null
    }
  }, [map])

  // Mount the geocoder into the host
  useEffect(() => {
    if (!map || !hostRef.current) return

    // Chicago-biased Nominatim
    const geocoder = L.Control.geocoder({
      // We’ll supply our own geocoder to pass query params:
      geocoder: L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
          // viewbox: left, top, right, bottom (≈ Chicagoland)
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

    // Add to map to get container, then move it into our host
    geocoder.addTo(map)
    geocoderRef.current = geocoder
    const ctrlEl = geocoder._container

    // Style tweaks: make it a bit more compact and neutral
    if (ctrlEl) {
      ctrlEl.style.pointerEvents = 'auto'
      ctrlEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.30)'
      ctrlEl.style.borderRadius = '10px'
      ctrlEl.style.overflow = 'hidden'
      ctrlEl.style.border = '1px solid rgba(255,255,255,0.14)'
      // move under our host (top-center)
      hostRef.current.appendChild(ctrlEl)

      // Prevent map interactions while using the control
      L.DomEvent.disableClickPropagation(ctrlEl)
      L.DomEvent.disableScrollPropagation(ctrlEl)
    }

    return () => {
      try {
        if (ctrlEl && hostRef.current && ctrlEl.parentNode === hostRef.current) {
          hostRef.current.removeChild(ctrlEl)
        }
      } catch {}
      if (geocoderRef.current) {
        geocoderRef.current.remove()
        geocoderRef.current = null
      }
    }
  }, [map, placeholder])

  return null
}

/**
 * Simple click hook to forward map clicks to parent (for placing draft pins).
 * We keep this behavior exactly as before.
 */
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

/**
 * MapShell
 * Props:
 * - mapMode: 'chicago' | 'global' (unchanged)
 * - mainMapRef: React ref to expose Leaflet map instance (unchanged)
 * - exploring: boolean (unchanged)
 * - onPick: function({lat,lng}) (unchanged)
 * - children: overlay layers/components (unchanged)
 */
export default function MapShell({
  mapMode,
  mainMapRef,
  exploring,
  onPick,
  children
}) {
  // Pick an initial center/zoom you already use elsewhere
  // (We don’t change any behavior here; this is just a safe fallback.)
  const center = useMemo(() => [41.8781, -87.6298], [])
  const zoom = useMemo(() => (mapMode === 'global' ? 3 : 11), [mapMode])

  const whenCreated = (map) => {
    if (mainMapRef) mainMapRef.current = map
  }

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
        {/* Keep your existing tile layer setup */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {/* Geocoder (Option 1): top-center and click-protected */}
        <GeocoderTopCenter />

        {/* Click handler for placing pins (unchanged) */}
        <ClickToPick onPick={onPick} />

        {/* Any overlays/children you already render (unchanged) */}
        {children}
      </MapContainer>
    </div>
  )
}
