// components/MapShell.jsx
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import {
  CHI, CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM,
  USA, GLOBAL_ZOOM,
} from '../lib/mapUtils'

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

    // Make sure interactions are enabled
    map.dragging?.enable()
    map.scrollWheelZoom?.enable()
    map.touchZoom?.enable()
    map.boxZoom?.enable()
    map.keyboard?.enable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only

  // Respond to mode changes
  useEffect(() => {
    // next tick to let layout settle
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
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
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
      whenCreated={(m) => { mainMapRef.current = m }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <MapModeController mode={mapMode} onMapReady={(m)=>{ mainMapRef.current = m }} />

      {/* Disable click-to-place while exploring */}
      <TapToPlace onPick={onPick} disabled={exploring} />

      {children}
    </MapContainer>
  )
}
  