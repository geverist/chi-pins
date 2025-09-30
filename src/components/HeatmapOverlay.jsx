// src/components/HeatmapOverlay.jsx
import { useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat' // npm i leaflet.heat

/**
 * HeatmapOverlay
 * - Renders a Leaflet heat layer from pins[]
 * - Respects minZoomForHeatmap (hide below this zoom)
 * - Pins with missing/invalid coords are ignored
 */
export default function HeatmapOverlay({
  pins = [],
  enabled = true,
  minZoomForHeatmap = 10,
  radius = 25,
  blur = 15,
  maxOpacity = 0.6,
}) {
  const map = useMap()

  const points = useMemo(() => {
    const out = []
    for (const p of pins || []) {
      const lat = Number(p?.lat)
      const lng = Number(p?.lng)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        // weight = 1; you could weight by recency or team if desired
        out.push([lat, lng, 1])
      }
    }
    return out
  }, [pins])

  useEffect(() => {
    if (!map || !enabled) return

    const visible = () => (map.getZoom?.() ?? 0) >= minZoomForHeatmap
    let layer = null

    const addLayer = () => {
      if (layer || !visible()) return
      layer = L.heatLayer(points, { radius, blur, maxOpacity })
      layer.addTo(map)
    }
    const removeLayer = () => {
      if (!layer) return
      map.removeLayer(layer)
      layer = null
    }

    addLayer()

    const onZoomEnd = () => {
      if (visible()) addLayer()
      else removeLayer()
    }
    map.on('zoomend', onZoomEnd)

    return () => {
      map.off('zoomend', onZoomEnd)
      removeLayer()
    }
  }, [map, enabled, points, radius, blur, maxOpacity, minZoomForHeatmap])

  return null
}
